/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { parse } from 'yaml';
import {
  ALERTZERO_ACTION_EDIT_RULE_WORKFLOW,
  ALERTZERO_RULE_DOCTOR_REVIEW_WORKFLOW,
  ALERTZERO_RULE_DOCTOR_SWEEP_WORKFLOW,
  ALERTZERO_RULE_WORKFLOW_IDS,
} from '.';
import { createWorkflowLiquidEngine } from '../../../common/utils';

interface YamlStep {
  name: string;
  type: string;
  if?: string;
  with?: Record<string, unknown>;
  steps?: YamlStep[];
  cases?: Array<{ steps?: YamlStep[] }>;
  default?: YamlStep[];
}

interface Definition {
  consts: Record<string, unknown>;
  steps: YamlStep[];
}

const flatten = (steps: YamlStep[]): YamlStep[] =>
  steps.flatMap((step) => [
    step,
    ...flatten(step.steps ?? []),
    ...flatten(step.default ?? []),
    ...(step.cases ?? []).flatMap((switchCase) => flatten(switchCase.steps ?? [])),
  ]);

const load = (yaml: string) => {
  const definition = parse(yaml) as Definition;
  const steps = flatten(definition.steps);
  const step = (name: string) => {
    const found = steps.find((candidate) => candidate.name === name);
    if (!found) throw new Error(`step "${name}" not found`);
    return found;
  };
  return { definition, steps, step };
};

const render = (template: unknown, context: Record<string, unknown>) =>
  createWorkflowLiquidEngine()
    .parseAndRenderSync(template as string, context)
    .trim();

const review = load(ALERTZERO_RULE_DOCTOR_REVIEW_WORKFLOW.yaml);
const worker = load(ALERTZERO_RULE_DOCTOR_SWEEP_WORKFLOW.yaml);

describe('rule doctor review', () => {
  describe('classify', () => {
    const cause = (message: string, symptom = 'run_failed') =>
      render(review.step('classify').with?.cause, {
        inputs: { symptom },
        steps: { fetch_rule: { output: { execution_summary: { last_execution: { message } } } } },
      });

    it.each([
      [
        'Unable to find matching indices for rule My rule. This warning will persist until one of the following occurs: a matching index is created or the rule is disabled.',
        'no_index',
      ],
      [
        'The following indices are missing the timestamp override field "event.ingested": ["logs-a"]',
        'bad_timestamp',
      ],
      [
        'The following indices are missing the timestamp field "@timestamp": ["logs-a"]',
        'bad_timestamp',
      ],
      [
        'verification_exception: Found 1 problem line 1:1: Unknown column [user.nme]',
        'missing_field',
      ],
      ['ML jobs are not started: Job ID: rare_process', 'ml_job_stopped'],
      [
        'This rule reached the maximum alert limit for the rule execution. Some alerts were not created.',
        'alert_limit',
      ],
      [
        'Unable to find matching threat indicator indices for rule My rule. This warning will persist until one of the following occurs: a matching threat index is created or the rule is disabled.',
        'no_threat_index',
      ],
      [
        'ES|QL query does not return _id metadata field for a non-aggregating query. This may result in duplicate alerts. Consider adding "METADATA _id" to the FROM command.',
        'esql_no_id',
      ],
      [
        'ES|QL query returns the metadata column(s) _index, which cannot be stored in alerts. Alerts were created without it.',
        'esql_bad_metadata',
      ],
      [
        "The following exceptions won't be applied to rule execution: Allow backup host",
        'exceptions_skipped',
      ],
      [
        'The ES|QL event query was only executed on the available shards. The query failed to run successfully on the following shards: [0]',
        'shard_failure',
      ],
      [
        'Cluster "remote" is "skipped" and its data is missing from this rule run (indices: "logs-*").',
        'shard_failure',
      ],
      ['Something nobody has seen before', 'unknown'],
      ['', 'unknown'],
    ])('labels "%s" as %s', (message, expected) => {
      expect(cause(message)).toBe(expected);
    });

    // A stale rule's last run succeeded, so its message says nothing useful.
    it('labels a stale-data rule no_data whatever its last message says', () => {
      expect(cause('Rule execution completed successfully', 'data_stale')).toBe('no_data');
    });
  });

  describe('resolve_fix', () => {
    const fixType = (fix: string, dataViewId?: string) =>
      render(review.step('resolve_fix').with?.fix_type, {
        steps: {
          diagnose_rule: { output: { structured_output: { fix_type: fix } } },
          fetch_rule: { output: { data_view_id: dataViewId } },
        },
      });

    it.each(['index', 'query', 'timestamp_override', 'suppression'])('keeps a %s fix', (fix) => {
      expect(fixType(fix)).toBe(fix);
    });

    it('keeps a threat index fix only on an indicator match rule', () => {
      const threatFix = (type: string) =>
        render(review.step('resolve_fix').with?.fix_type, {
          steps: {
            diagnose_rule: { output: { structured_output: { fix_type: 'threat_index' } } },
            fetch_rule: { output: { type } },
          },
        });

      expect(threatFix('threat_match')).toBe('threat_index');
      expect(threatFix('query')).toBe('none');
    });

    // A data view rule ignores `index`, so an index patch would change nothing.
    it('turns an index fix on a data view rule into a manual recommendation', () => {
      expect(fixType('index', 'my-data-view')).toBe('none');
    });

    it.each(['none', 'something_else'])('treats %s as no automatic fix', (fix) => {
      expect(fixType(fix)).toBe('none');
    });
  });

  describe('judge_fix', () => {
    const judge = (fixType: string, recent: number, cause = 'no_index', limitReached = false) =>
      // `${{ }}` keeps the value's type at runtime; plain Liquid just needs the `$` gone.
      render((review.step('judge_fix').with?.proven as string).slice(1), {
        steps: {
          classify: { output: { cause } },
          run_previews: {
            output: { proposed_succeeded: true, proposed_alert_limit_reached: limitReached },
          },
          resolve_fix: { output: { fix_type: fixType } },
          proposed_latest_event: { output: { aggregations: { recent: { doc_count: recent } } } },
        },
      });

    // Seen live: the agent proposed an unrelated index whose newest event was weeks old.
    it('rejects an index fix whose indices got no events lately', () => {
      expect(judge('index', 0)).toBe('false');
      expect(judge('index', 3)).toBe('true');
    });

    it('does not ask a query fix for recent events', () => {
      expect(judge('query', 0)).toBe('true');
    });

    it('asks a threat index fix for recent indicators', () => {
      expect(judge('threat_index', 0)).toBe('false');
      expect(judge('threat_index', 3)).toBe('true');
    });

    // A fix for a rule at its alert limit only works if the fixed rule stays under it.
    it.each(['suppression', 'query'])(
      'rejects a %s fix that still hits the alert limit',
      (fixType) => {
        expect(judge(fixType, 0, 'alert_limit', true)).toBe('false');
        expect(judge(fixType, 0, 'alert_limit', false)).toBe('true');
      }
    );

    it('drops the separator the preview leaves after each error', () => {
      const error = render(review.step('judge_fix').with?.current_error, {
        steps: { run_previews: { output: { error_text: 'Unknown column [user_name]; ' } } },
      });
      expect(error).toBe('Unknown column [user_name]');
    });
  });

  describe('proposals', () => {
    const actionArms = [
      'propose_index',
      'propose_query',
      'propose_timestamp_override',
      'propose_suppression',
      'propose_threat_index',
    ];

    // A fix built against an older revision would overwrite whatever changed since.
    it.each(actionArms)('%s edits the rule against the revision it diagnosed', (name) => {
      const inputs = review.step(name).with?.inputs as Record<string, any>;
      expect(inputs.actionWorkflowId).toBe(ALERTZERO_ACTION_EDIT_RULE_WORKFLOW.id);
      expect(inputs.actionInput.expected_revision).toBe('${{ steps.fetch_rule.output.revision }}');
      expect(inputs.autoApprove).toBe(false);
    });

    it('sends an unproven fix to the manual arm', () => {
      const kind = (proven: boolean) =>
        render(review.step('resolve_proposal_kind').with?.kind, {
          steps: {
            judge_fix: { output: { proven } },
            resolve_fix: { output: { fix_type: 'query' } },
          },
        });

      expect(kind(true)).toBe('query');
      expect(kind(false)).toBe('manual');
    });
  });

  it('keys concurrency on the rule so one rule never has two open gates', () => {
    const settings = parse(ALERTZERO_RULE_DOCTOR_REVIEW_WORKFLOW.yaml).settings;
    expect(settings.concurrency).toEqual({
      key: 'rule-doctor-review-{{ inputs.rule_uuid }}',
      strategy: 'drop',
      max: 1,
    });
  });
});

describe('rule doctor worker', () => {
  describe('resolve_failing_rules', () => {
    // Ids starting with "w" warned; the rest failed.
    const ids = (ruleIds: string[], activeIds: string[], maxRules: number) =>
      render(worker.step('resolve_failing_rules').with?.ids, {
        steps: {
          list_failing_rules: {
            output: {
              data: ruleIds.map((id) => ({
                id,
                execution_summary: {
                  last_execution: { status: id.startsWith('w') ? 'partial failure' : 'failed' },
                },
              })),
            },
          },
          collect_active_rules: { output: { keys: `,${activeIds.join(',')},` } },
          resolve_settings: { output: { max_rules: maxRules } },
        },
      });

    it('lists every failing rule', () => {
      expect(ids(['a', 'b'], [], 10)).toBe(',a,b');
    });

    it('skips rules that already have a review in flight', () => {
      expect(ids(['a', 'b', 'c'], ['b'], 10)).toBe(',a,c');
    });

    it('stops at the per-sweep limit', () => {
      expect(ids(['a', 'b', 'c'], [], 2)).toBe(',a,b');
    });

    it('does not count skipped rules against the limit', () => {
      expect(ids(['a', 'b', 'c'], ['a'], 2)).toBe(',b,c');
    });

    it('fills the limit with failed rules before warnings', () => {
      expect(ids(['w1', 'a', 'w2', 'b'], [], 3)).toBe(',a,b,w1');
    });
  });

  describe('judge_freshness', () => {
    const stale = (active: boolean, latest: number | null) =>
      render((worker.step('judge_freshness').with?.stale as string).slice(1), {
        steps: {
          prepare_check: { output: { active } },
          latest_event: { output: { aggregations: { latest: { value: latest } } } },
          resolve_settings: { output: { stale_before_ms: 1000 } },
        },
      });

    it('flags a rule whose newest event is older than the threshold', () => {
      expect(stale(false, 500)).toBe('true');
      expect(stale(false, 1500)).toBe('false');
    });

    // Seen live: the search is skipped for a rule under review, and the step then
    // read the previous rule's result and judged the busy rule stale.
    it('never flags a rule that already has a review open', () => {
      expect(stale(true, 500)).toBe('false');
    });

    it('does not flag a source that never had events', () => {
      expect(stale(false, null)).toBe('false');
    });
  });

  // The sweep strips this prefix to find rules under review; a mismatch would let
  // every sweep re-pick them.
  it('strips the review concurrency prefix from in-flight keys', () => {
    const collect = worker.step('collect_active_rules').with?.keys as string;
    expect(collect).toContain("remove: 'rule-doctor-review-'");
  });

  it('starts the doctor review from both picks', () => {
    for (const name of ['run_failing_review', 'run_stale_review']) {
      expect(worker.step(name).with?.['workflow-id']).toBe(
        ALERTZERO_RULE_DOCTOR_REVIEW_WORKFLOW.id
      );
    }
  });
});

describe('rule doctor registration', () => {
  it('installs both doctor workflows with the other rule workflows', () => {
    expect(ALERTZERO_RULE_WORKFLOW_IDS).toEqual(
      expect.arrayContaining([
        ALERTZERO_RULE_DOCTOR_SWEEP_WORKFLOW.id,
        ALERTZERO_RULE_DOCTOR_REVIEW_WORKFLOW.id,
      ])
    );
  });

  // The doctor's fixes go through the shared edit action, so it must patch these fields.
  it.each(['index', 'timestamp_override', 'threat_index', 'alert_suppression'])(
    'lets the edit-rule action change %s',
    (field) => {
      const patch = load(ALERTZERO_ACTION_EDIT_RULE_WORKFLOW.yaml).step('patch_rule').with?.patch;
      expect(patch).toContain(`'${field}'`);
    }
  );
});
