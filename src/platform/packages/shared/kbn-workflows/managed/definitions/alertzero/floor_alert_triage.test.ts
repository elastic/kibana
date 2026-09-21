/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { parse } from 'yaml';
import FLOOR_ALERT_TRIAGE_YAML from './floor_alert_triage.yaml';
import { createWorkflowLiquidEngine } from '../../../common/utils';

interface YamlStep {
  name: string;
  type?: string;
  with?: Record<string, unknown>;
  steps?: YamlStep[];
  else?: YamlStep[];
  foreach?: string;
  condition?: string;
  'on-failure'?: { continue?: boolean };
}

const parsed = parse(FLOOR_ALERT_TRIAGE_YAML) as { steps: YamlStep[] };

const flatten = (steps: YamlStep[]): YamlStep[] =>
  steps.flatMap((s) => [s, ...flatten(s.steps ?? []), ...flatten(s.else ?? [])]);

const allSteps = flatten(parsed.steps);
const stepByName = (name: string) => allSteps.find((s) => s.name === name);

const engine = createWorkflowLiquidEngine();

const renderString = (template: string, context: Record<string, unknown>): string =>
  engine.parseAndRenderSync(template, context);

const evalExpr = (expr: string, context: Record<string, unknown>): unknown => {
  const trimmed = expr.trim();
  if (trimmed.startsWith('${{') && trimmed.endsWith('}}')) {
    return engine.evalValueSync(trimmed.slice(3, -2).trim(), context);
  }
  return renderString(trimmed, context);
};

// ---------------------------------------------------------------------------
// Dismiss mapping: map_dismiss_reason_to_tag
// ---------------------------------------------------------------------------

const mapDismissReasonToTag = stepByName('map_dismiss_reason_to_tag');
const dismissedTagTemplate = mapDismissReasonToTag?.with?.dismissed_tag as string;

const evaluateDismissedTag = (dismissReason: string | undefined): string => {
  const context = {
    steps: {
      get_proposal: {
        output: { dismissReason },
      },
    },
  };
  return renderString(dismissedTagTemplate, context).trim();
};

describe('floor_alert_triage — dismiss mapping', () => {
  it('maps dismissReason "wrong" to az:true_positive', () => {
    expect(evaluateDismissedTag('wrong')).toBe('az:true_positive');
  });

  it.each(['not_applicable', 'inconclusive', 'too_risky', 'other'])(
    'maps dismissReason "%s" to az:inconclusive',
    (reason) => {
      expect(evaluateDismissedTag(reason)).toBe('az:inconclusive');
    }
  );

  it('maps a missing dismissReason (undefined) to az:inconclusive', () => {
    expect(evaluateDismissedTag(undefined)).toBe('az:inconclusive');
  });

  it('remove_fp_tag and add_dismissed_tag never share a tag', () => {
    const removeFp = stepByName('remove_fp_tag')?.with?.tags as {
      tags_to_remove?: string[];
      tags_to_add?: string[];
    };
    const addDismissed = stepByName('add_dismissed_tag')?.with?.tags as {
      tags_to_remove?: string[];
      tags_to_add?: string[];
    };

    expect(removeFp?.tags_to_add).toEqual([]);
    expect(addDismissed?.tags_to_remove).toEqual([]);
    const removed = new Set(removeFp?.tags_to_remove ?? []);
    const added = new Set(addDismissed?.tags_to_add ?? []);
    // No static overlap (dynamic dismissed_tag is a variable, not a literal here)
    for (const tag of added) {
      expect(removed.has(tag)).toBe(false);
    }
  });
});

// ---------------------------------------------------------------------------
// post_comment_outcome_dismissed — rationale truncation and escaping
// ---------------------------------------------------------------------------

const dismissedComment = stepByName('post_comment_outcome_dismissed');
const dismissedInputTemplate = (dismissedComment?.with?.body as Record<string, unknown>)
  ?.input as string;

const renderDismissedComment = ({
  dismissReason = 'wrong',
  rationale,
  decidedBy,
  dismissedTag = 'az:true_positive',
  fpCandidateCount = 2,
}: {
  dismissReason?: string;
  rationale?: string;
  decidedBy?: { username: string };
  dismissedTag?: string;
  fpCandidateCount?: number;
}): string => {
  return renderString(dismissedInputTemplate, {
    steps: {
      get_proposal: {
        output: { decision: 'dismissed', dismissReason, rationale, decidedBy },
      },
    },
    variables: { dismissed_tag: dismissedTag, fp_candidate_count: fpCandidateCount },
  });
};

describe('floor_alert_triage — post_comment_outcome_dismissed', () => {
  it('includes the dismiss reason', () => {
    const comment = renderDismissedComment({ dismissReason: 'wrong' });
    expect(comment).toContain('wrong');
  });

  it('truncates a long rationale to 500 characters', () => {
    const longRationale = 'x'.repeat(5000);
    const comment = renderDismissedComment({ rationale: longRationale });
    // Liquid truncate: 500 appends "..." making total ≤ 500
    const rationaleSection = comment.match(/Rationale: "(.+?)"\./)?.[1];
    expect(rationaleSection).toBeDefined();
    expect((rationaleSection ?? '').length).toBeLessThanOrEqual(500);
  });

  it('escapes HTML in the rationale', () => {
    const comment = renderDismissedComment({ rationale: '<script>alert(1)</script>' });
    expect(comment).not.toContain('<script>');
    expect(comment).toContain('&lt;script&gt;');
  });

  it('omits the rationale section when rationale is blank', () => {
    const comment = renderDismissedComment({ rationale: '' });
    expect(comment).not.toContain('Rationale');
  });

  it('names the decider when decidedBy is present', () => {
    const comment = renderDismissedComment({ decidedBy: { username: 'analyst1' } });
    expect(comment).toContain('@analyst1');
  });
});

// ---------------------------------------------------------------------------
// post_comment_triage_started — alert IDs and feature routing
// ---------------------------------------------------------------------------

const triageStartedComment = stepByName('post_comment_triage_started');
const triageInputTemplate = (triageStartedComment?.with?.body as Record<string, unknown>)
  ?.input as string;

const makeAlerts = (count: number) =>
  Array.from({ length: count }, (_, i) => ({ _id: `alert-id-${i + 1}` }));

const renderTriageStarted = (alertCount: number): string =>
  renderString(triageInputTemplate, {
    event: { rule: { name: 'My Rule' }, alerts: makeAlerts(alertCount) },
    steps: { create_investigation: { output: { conversation_id: 'conv-1' } } },
    execution: { url: 'https://kibana.example.com/app/exec/1' },
  });

describe('floor_alert_triage — post_comment_triage_started', () => {
  it('includes the alertzero_alert_triage feature name for model routing', () => {
    const comment = renderTriageStarted(3);
    expect(comment).toContain('alertzero_alert_triage');
  });

  it('lists up to 10 alert IDs for small batches', () => {
    const comment = renderTriageStarted(3);
    expect(comment).toContain('alert-id-1');
    expect(comment).toContain('alert-id-3');
    expect(comment).not.toContain('more');
  });

  it('shows first 10 IDs and "and N more" for a 50-alert batch', () => {
    const comment = renderTriageStarted(50);
    expect(comment).toContain('alert-id-1');
    expect(comment).toContain('alert-id-10');
    expect(comment).not.toContain('alert-id-11');
    expect(comment).toContain('and 40 more');
  });
});
