/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { parse } from 'yaml';
import FLOOR_ALERT_TRIAGE_EXCLUSION_YAML from './floor_alert_triage_exclusion.yaml';
import { createWorkflowLiquidEngine } from '../../../common/utils';

interface ParsedStep {
  name: string;
  type: string;
  foreach?: string;
  steps?: ParsedStep[];
  with?: Record<string, unknown>;
}

const workflow = parse(FLOOR_ALERT_TRIAGE_EXCLUSION_YAML) as {
  triggers: Array<{ type: string; on?: { condition?: string } }>;
  consts: Record<string, string>;
  steps: ParsedStep[];
};
const engine = createWorkflowLiquidEngine();
const step = (name: string) => workflow.steps.find((candidate) => candidate.name === name)!;
const inner = (name: string) => step(name).steps![0];

describe('floor_alert_triage_exclusion', () => {
  it('starts on an alert tag change, filtered to what an analyst does to exclude an alert', () => {
    expect(workflow.triggers).toHaveLength(1);
    expect(workflow.triggers[0].type).toBe('security.alertTagsChanged');
    expect(workflow.triggers[0].on?.condition).toContain('event.tagsAdded: "az:true_positive"');
    expect(workflow.triggers[0].on?.condition).toContain('event.tagsAdded: "az:inconclusive"');
    expect(workflow.triggers[0].on?.condition).toContain('event.tagsRemoved: "az:false_positive"');
  });

  it('revises the proposals first, then re-tags, so the re-tag events find nothing to do', () => {
    expect(workflow.steps.map(({ name }) => name)).toEqual([
      'exclude_alerts',
      'count_excluded',
      'untag_excluded_alerts',
      'give_excluded_alerts_a_verdict',
      'note_exclusions',
    ]);
    expect(step('exclude_alerts').type).toBe('alertzero.triage.excludeFromProposal');
    expect(step('exclude_alerts').with).toEqual({ alert_ids: '${{ event.alertIds }}' });
  });

  it('removes az:false_positive and az:model_fp from the excluded alerts', () => {
    expect(inner('untag_excluded_alerts').with).toEqual(
      expect.objectContaining({
        tags: { tags_to_add: [], tags_to_remove: ['az:false_positive', 'az:model_fp'] },
      })
    );
  });

  it('gives an excluded alert with no verdict az:inconclusive, so the sweep does not re-plan it', () => {
    expect(step('give_excluded_alerts_a_verdict').foreach).toContain('needs_verdict_alert_ids');
    expect(inner('give_excluded_alerts_a_verdict').with).toEqual(
      expect.objectContaining({ tags: { tags_to_add: ['az:inconclusive'], tags_to_remove: [] } })
    );
  });

  describe('the note in the proposal Investigation', () => {
    const render = (item: Record<string, unknown>) =>
      engine
        .parseAndRenderSync(inner('note_exclusions').with!.message as string, {
          foreach: { item },
        })
        .replace(/\s+/g, ' ')
        .trim();
    const item = {
      excluded_count: 2,
      true_positive_count: 0,
      remaining_count: 38,
      revision: 3,
      revised: true,
    };

    it('reports the new size of the proposal', () => {
      expect(render(item)).toBe(
        '2 alerts excluded by an analyst. The proposal now lists 38 alerts (revision 3).'
      );
    });

    it('flags true positives, which suggest the group is too coarse', () => {
      expect(render({ ...item, excluded_count: 1, true_positive_count: 1 })).toContain(
        '1 alert excluded by an analyst, 1 marked true positive. The pattern may be too coarse'
      );
    });

    it('says the proposal still lists the alerts, and that they are not closed, when it could not be revised', () => {
      expect(render({ ...item, revised: false })).toContain(
        'The proposal could not be revised, so it still lists them. They will not be closed'
      );
    });
  });
});
