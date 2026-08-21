/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { parse } from 'yaml';
import { PND_WATCH_DARK_WORKFLOW } from './watch_dark';
import type { DarkWatchTemplateValues } from './watch_template_values';
import { convertToWorkflowGraph } from '../../../graph';
import { WorkflowSchema } from '../../../spec/schema';

const values: DarkWatchTemplateValues = {
  settingsVersion: 1,
  autonomyLevel: 'supervised',
  scheduleId: 'dark-overnight-sweep',
  allowManualRun: true,
  scopes: [{ name: 'Mail · IdP', access: 'full', label: 'Read + monitor' }],
  connectorId: 'dark-inference-connector',
  tier2When: 'on_hits',
  candidateLimit: 10,
  fanOutMax: 10,
  scheduleEveryMinutes: 240,
  targetTechnology: 'aws_iam',
  leadPollIntervalMinutes: 60,
  leadMinPriority: 7,
  intelEventTriggerEnabled: false,
};

describe('PND_WATCH_DARK_WORKFLOW', () => {
  const renderedYaml = PND_WATCH_DARK_WORKFLOW.yamlTemplate(values);
  const parsed = WorkflowSchema.safeParse(parse(renderedYaml));

  it('renders settings that satisfy the full workflow schema', () => {
    expect(parsed.error?.issues).toBeUndefined();
    expect(parsed.success).toBe(true);
  });

  it('compiles to an execution graph', () => {
    if (!parsed.success) throw new Error('Rendered Dark Watch YAML failed schema validation');

    expect(() => convertToWorkflowGraph(parsed.data)).not.toThrow();
  });

  // `size` and `concurrency.max` are numbers in the workflow schema, so they are
  // rendered as literals instead of Liquid references to consts.watch_settings.
  it('renders numeric dials as numbers rather than templates', () => {
    const document = parse(renderedYaml) as {
      steps: Array<{
        name: string;
        with?: { size?: unknown };
        concurrency?: { max?: unknown };
      }>;
    };
    const selectStep = document.steps.find(({ name }) => name === 'select_candidate_reports');
    const fanOutStep = document.steps.find(({ name }) => name === 'report_fan_out');

    expect(selectStep?.with?.size).toBe(values.candidateLimit);
    expect(fanOutStep?.concurrency?.max).toBe(values.fanOutMax);
  });

  it('passes the Tier 2 dials to the hunt Worker', () => {
    const document = parse(renderedYaml) as {
      steps: Array<{ name: string; steps?: Array<{ name: string; with?: { inputs?: unknown } }> }>;
    };
    const huntStep = document.steps
      .find(({ name }) => name === 'report_fan_out')
      ?.steps?.find(({ name }) => name === 'hunt');

    expect(huntStep?.with?.inputs).toMatchObject({
      connector_id: '{{ consts.watch_settings.connectorId }}',
      tier2_when: '{{ consts.watch_settings.tier2When }}',
      target_technology: '{{ consts.watch_settings.targetTechnology }}',
    });
  });
});
