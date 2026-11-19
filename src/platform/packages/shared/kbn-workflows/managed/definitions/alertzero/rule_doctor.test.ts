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
  ALERTZERO_ACTION_DISABLE_RULE_WORKFLOW,
  ALERTZERO_ACTION_EDIT_RULE_WORKFLOW,
  ALERTZERO_ACTION_START_ML_JOBS_WORKFLOW,
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
  const consts = review.definition.consts;

  describe('match_message', () => {
    const cause = (message: string, symptom = 'run_failed', type = 'query') =>
      render(review.step('match_message').with?.cause, {
        inputs: { symptom },
        steps: {
          fetch_rule: { output: { type, execution_summary: { last_execution: { message } } } },
        },
      });

    it.each([
      [
        'Unable to find matching indices for rule My rule. This warning will persist until one of the following occurs: a matching index is created or the rule is disabled.',
        'no_index',
      ],
      ['index_not_found_exception: no such index [logs-gone]', 'no_index'],
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
      ['parsing_exception: line 1:12: mismatched input', 'query_syntax'],
      ['Saved object [index-pattern/abc-123] not found', 'no_data_view'],
      [
        'Fielddata is disabled on [host.id] in [logs-a]. Text fields are not optimised for operations',
        'text_field_agg',
      ],
      ['ML jobs are not started: Job ID: rare_process', 'ml_job_stopped'],
      ["No known job with id 'v3_rare_process'", 'ml_job_missing'],
      [
        'This rule reached the maximum alert limit for the rule execution. Some alerts were not created.',
        'alert_limit',
      ],
      ['Rule reported more than 1000 alerts.', 'alert_limit'],
      [
        "The rule's max alerts per run setting (10000) is greater than the Kibana alerting limit (1000). The rule will only write a maximum of 1000 alerts per rule run.",
        'max_signals_over_cap',
      ],
      [
        '2 minutes (120000ms) were not queried between this rule execution and the last execution, so signals may have been missed.',
        'execution_gap',
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
        'security_exception: action [indices:data/read/search] is unauthorized',
        'missing_privileges',
      ],
      ['circuit_breaking_exception: [parent] Data too large', 'cluster_health'],
      ['cluster_block_exception: index [logs-a] blocked by: [FORBIDDEN/12]', 'cluster_health'],
      ['no_shard_available_action_exception', 'cluster_health'],
      ['connect ECONNREFUSED 127.0.0.1:9200', 'cluster_health'],
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

    // A machine learning rule names its missing job without the Elasticsearch wording.
    it('labels a missing job on a machine learning rule', () => {
      expect(cause('v3_rare_process missing', 'run_failed', 'machine_learning')).toBe(
        'ml_job_missing'
      );
      expect(cause('v3_rare_process missing', 'run_failed', 'query')).toBe('unknown');
    });

    // A stale rule's last run succeeded, so its message says nothing useful.
    it('labels a stale-data rule no_data whatever its last message says', () => {
      expect(cause('Rule execution completed successfully', 'data_stale')).toBe('no_data');
    });

    it('falls back to the newest logged run when the last message is empty', () => {
      const message = render(review.step('match_message').with?.message, {
        steps: {
          fetch_rule: { output: { execution_summary: { last_execution: { message: '' } } } },
          fetch_run_log: { output: { data: [{ outcome: { message: 'Error searching events' } }] } },
        },
      });
      expect(message).toBe('Error searching events');
    });

    it('counts only the failures in a row, newest first', () => {
      const streak = (statuses: string[]) =>
        render(review.step('match_message').with?.failure_streak, {
          steps: {
            fetch_run_log: {
              output: { data: statuses.map((status) => ({ outcome: { status } })) },
            },
          },
        });

      expect(streak(['failure', 'failure', 'success', 'failure'])).toBe('2');
      expect(streak(['success', 'failure'])).toBe('0');
      expect(streak([])).toBe('0');
    });
  });

  describe('classify', () => {
    const cause = (matched: string, buckets: Array<{ key: string }>) =>
      render(review.step('classify').with?.cause, {
        steps: {
          match_message: { output: { cause: matched } },
          visible_indices: { output: { aggregations: { indices: { buckets } } } },
        },
      });

    // Kibana checks indices with the rule's key, so a key that sees nothing reports
    // no matching index even when the worker finds events.
    it('blames the API key when the worker sees the indices', () => {
      expect(cause('no_index', [{ key: 'logs-a' }])).toBe('key_cannot_see');
      expect(cause('no_index', [])).toBe('no_index');
      expect(cause('missing_field', [{ key: 'logs-a' }])).toBe('missing_field');
    });
  });

  describe('gate', () => {
    const proceed = (cause: string, streak: number) =>
      render((review.step('gate').with?.proceed as string).slice(1), {
        consts,
        steps: { classify: { output: { cause, failure_streak: streak } } },
      });

    it('reviews cluster trouble only after several failures in a row', () => {
      expect(proceed('cluster_health', 2)).toBe('false');
      expect(proceed('cluster_health', 3)).toBe('true');
    });

    it('lets every other cause through at once', () => {
      expect(proceed('missing_field', 0)).toBe('true');
    });
  });

  describe('collect_facts', () => {
    it('reports whether each related integration is installed and on a policy', () => {
      const integrations = render(review.step('collect_facts').with?.integrations, {
        steps: {
          fetch_rule: {
            output: {
              related_integrations: [
                { package: 'aws', integration: 'cloudtrail' },
                { package: 'okta' },
                { package: 'gone' },
              ],
            },
          },
          list_integrations: {
            output: {
              integrations: [
                {
                  package_name: 'aws',
                  integration_name: 'cloudtrail',
                  integration_title: 'AWS CloudTrail',
                  is_installed: true,
                  is_enabled: false,
                },
                {
                  package_name: 'okta',
                  package_title: 'Okta',
                  is_installed: false,
                  is_enabled: false,
                },
              ],
            },
          },
        },
      });

      expect(integrations).toContain(
        'AWS CloudTrail (aws/cloudtrail): installed, on no agent policy'
      );
      expect(integrations).toContain('Okta (okta): not installed, on no agent policy');
      expect(integrations).toContain('gone: status unknown');
    });
  });

  describe('resolve_fix', () => {
    const fixType = (
      out: Record<string, unknown>,
      rule: Record<string, unknown> = {},
      cause = 'no_index',
      dataViews: Array<{ id: string }> = []
    ) =>
      render(review.step('resolve_fix').with?.fix_type, {
        consts,
        steps: {
          diagnose_rule: { output: { structured_output: out } },
          fetch_rule: { output: rule },
          classify: { output: { cause } },
          list_data_views: { output: { data_view: dataViews } },
        },
      });

    it.each(['query', 'timestamp_override', 'suppression'])('keeps a %s fix', (fix) => {
      expect(fixType({ fix_type: fix })).toBe(fix);
    });

    it('keeps an index fix that moves the rule to other patterns', () => {
      expect(
        fixType({ fix_type: 'index', proposed_index: ['logs-b'] }, { index: ['logs-a'] })
      ).toBe('index');
    });

    // The same patterns preview clean as the worker while the rule's key still sees nothing.
    it('refuses an index fix that repeats the current patterns', () => {
      expect(
        fixType({ fix_type: 'index', proposed_index: ['logs-a'] }, { index: ['logs-a'] })
      ).toBe('none');
    });

    // A data view rule ignores `index`, so an index patch would change nothing.
    it('turns an index fix on a data view rule into a manual recommendation', () => {
      expect(
        fixType({ fix_type: 'index', proposed_index: ['logs-b'] }, { data_view_id: 'my-view' })
      ).toBe('none');
    });

    it('keeps a threat index fix only on an indicator match rule', () => {
      expect(fixType({ fix_type: 'threat_index' }, { type: 'threat_match' })).toBe('threat_index');
      expect(fixType({ fix_type: 'threat_index' }, { type: 'query' })).toBe('none');
    });

    it('keeps a look-back fix only as date math from now', () => {
      expect(fixType({ fix_type: 'lookback', proposed_from: 'now-15m' })).toBe('lookback');
      expect(fixType({ fix_type: 'lookback', proposed_from: '2026-01-01' })).toBe('none');
    });

    it('only ever lowers max alerts', () => {
      expect(
        fixType({ fix_type: 'max_signals', proposed_max_signals: 1000 }, { max_signals: 10000 })
      ).toBe('max_signals');
      expect(
        fixType({ fix_type: 'max_signals', proposed_max_signals: 20000 }, { max_signals: 10000 })
      ).toBe('none');
    });

    it('keeps a data view fix only for a data view the space has', () => {
      const rule = { data_view_id: 'gone' };
      expect(
        fixType({ fix_type: 'data_view', proposed_data_view_id: 'logs' }, rule, 'no_data_view', [
          { id: 'logs' },
        ])
      ).toBe('data_view');
      expect(
        fixType({ fix_type: 'data_view', proposed_data_view_id: 'made-up' }, rule, 'no_data_view', [
          { id: 'logs' },
        ])
      ).toBe('none');
    });

    it.each([
      ['threshold', 'group_fields'],
      ['new_terms', 'group_fields'],
      ['query', 'none'],
    ])('keeps a group fields fix on a %s rule as %s', (type, expected) => {
      expect(fixType({ fix_type: 'group_fields' }, { type })).toBe(expected);
    });

    it('keeps a machine learning job fix only on a machine learning rule', () => {
      expect(fixType({ fix_type: 'ml_job' }, { type: 'machine_learning' })).toBe('ml_job');
      expect(fixType({ fix_type: 'ml_job' }, { type: 'query' })).toBe('none');
    });

    // Disabling is only right when the rule can never find data.
    it.each([
      ['no_index', 'disable'],
      ['no_data', 'disable'],
      ['no_threat_index', 'disable'],
      ['no_data_view', 'disable'],
      ['key_cannot_see', 'none'],
      ['missing_field', 'none'],
      ['alert_limit', 'none'],
      ['cluster_health', 'none'],
    ])('on cause %s turns a disable fix into %s', (cause, expected) => {
      expect(fixType({ fix_type: 'disable' }, {}, cause)).toBe(expected);
    });

    it.each(['none', 'something_else'])('treats %s as no automatic fix', (fix) => {
      expect(fixType({ fix_type: fix })).toBe('none');
    });
  });

  describe('judge_fix', () => {
    const judge = (
      fixType: string,
      recent: number,
      cause = 'no_index',
      limitReached = false,
      groupHits = 1
    ) =>
      // `${{ }}` keeps the value's type at runtime; plain Liquid just needs the `$` gone.
      render((review.step('judge_fix').with?.proven as string).slice(1), {
        steps: {
          classify: { output: { cause } },
          run_previews: {
            output: { proposed_succeeded: true, proposed_alert_limit_reached: limitReached },
          },
          resolve_fix: { output: { fix_type: fixType } },
          proposed_latest_event: { output: { aggregations: { recent: { doc_count: recent } } } },
          group_fields_present: { output: { hits: { total: { value: groupHits } } } },
        },
      });

    // Seen live: grouping by a field that does not exist previewed clean with no alerts.
    it('rejects grouping fields that hold no values', () => {
      expect(judge('group_fields', 0, 'text_field_agg', false, 0)).toBe('false');
      expect(judge('group_fields', 0, 'text_field_agg', false, 4)).toBe('true');
    });

    // Seen live: a broad data view previewed clean but hit the alert limit.
    it.each(['data_view', 'index', 'query'])('rejects a %s fix that floods alerts', (fixType) => {
      expect(judge(fixType, 3, 'no_data_view', true)).toBe('false');
    });

    // Seen live: the agent proposed an unrelated index whose newest event was weeks old.
    it.each(['index', 'threat_index', 'data_view'])(
      'rejects a %s fix whose data got no events lately',
      (fixType) => {
        expect(judge(fixType, 0)).toBe('false');
        expect(judge(fixType, 3)).toBe('true');
      }
    );

    it.each(['query', 'lookback', 'max_signals', 'group_fields'])(
      'does not ask a %s fix for recent events',
      (fixType) => {
        expect(judge(fixType, 0, 'unknown')).toBe('true');
      }
    );

    // Nothing to preview: the approval gate holds these.
    it.each(['ml_job', 'disable'])('passes a %s fix without a preview', (fixType) => {
      const proven = render((review.step('judge_fix').with?.proven as string).slice(1), {
        steps: { resolve_fix: { output: { fix_type: fixType } } },
      });
      expect(proven).toBe('true');
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
    const editArms = [
      'propose_index',
      'propose_query',
      'propose_timestamp_override',
      'propose_suppression',
      'propose_threat_index',
      'propose_lookback',
      'propose_max_signals',
      'propose_data_view',
      'propose_group_fields',
    ];

    // A fix built against an older revision would overwrite whatever changed since.
    it.each(editArms)('%s edits the rule against the revision it diagnosed', (name) => {
      const inputs = review.step(name).with?.inputs as Record<string, any>;
      expect(inputs.actionWorkflowId).toBe(ALERTZERO_ACTION_EDIT_RULE_WORKFLOW.id);
      expect(inputs.actionInput.expected_revision).toBe('${{ steps.fetch_rule.output.revision }}');
      expect(inputs.autoApprove).toBe(false);
    });

    it('disables a rule only through the gated disable action', () => {
      const inputs = review.step('propose_disable').with?.inputs as Record<string, any>;
      expect(inputs.actionWorkflowId).toBe(ALERTZERO_ACTION_DISABLE_RULE_WORKFLOW.id);
      expect(inputs.actionInput.expected_revision).toBe('${{ steps.fetch_rule.output.revision }}');
      expect(inputs.autoApprove).toBe(false);
    });

    it('starts the rule own jobs through the gated machine learning action', () => {
      const inputs = review.step('propose_ml_job').with?.inputs as Record<string, any>;
      expect(inputs.actionWorkflowId).toBe(ALERTZERO_ACTION_START_ML_JOBS_WORKFLOW.id);
      expect(inputs.actionInput.job_ids).toBe(
        '${{ steps.fetch_rule.output.machine_learning_job_id }}'
      );
      expect(inputs.autoApprove).toBe(false);
    });

    it('counts every arm when it records the decision', () => {
      const decision = review.step('record_decision').with as Record<string, string>;
      for (const name of [...editArms, 'propose_disable', 'propose_ml_job']) {
        expect(decision.applied).toContain(`steps.${name}.output.status`);
        expect(decision.approved).toContain(`steps.${name}.output.decision`);
      }
      expect(decision.approved).toContain('steps.propose_manual.output.decision');
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

    it('names who should act on a manual proposal', () => {
      const comment = render(review.step('compose_proposal').with?.comment, {
        consts,
        inputs: { rule_uuid: 'r1' },
        workflow: { spaceId: 'default' },
        steps: {
          fetch_rule: { output: { name: 'My rule' } },
          classify: { output: { key_owner: 'jdoe' } },
          resolve_proposal_kind: { output: { kind: 'manual' } },
          resolve_fix: { output: { fix_type: 'none' } },
          judge_fix: { output: { proven: false } },
          diagnose_rule: {
            output: {
              structured_output: { recommendation: 'Save the rule again.', owner: 'rule_owner' },
            },
          },
        },
      });
      expect(comment).toContain(
        "**Who should act:** rule owner (the rule's API key belongs to `jdoe`)"
      );
    });
  });

  describe('follow-up', () => {
    const healed = (
      kind: string,
      refetch: Record<string, unknown>,
      since = '2026-01-01T00:10:00Z'
    ) =>
      render((review.step('judge_followup').with?.healed as string).slice(1), {
        steps: {
          record_decision: { output: { kind } },
          fetch_rule: { output: { revision: 1 } },
          refetch_rule: { output: refetch },
          followup_since: { output: { since } },
        },
      });

    it('calls a disabled rule done once it is off', () => {
      expect(healed('disable', { enabled: false, revision: 2 })).toBe('true');
      expect(healed('disable', { enabled: true, revision: 1 })).toBe('false');
    });

    // Starting jobs leaves the rule's revision as it was.
    it('heals a machine learning rule on a clean run after approval', () => {
      const run = (date: string, status: string) => ({
        revision: 1,
        execution_summary: { last_execution: { date, status } },
      });
      expect(healed('ml_job', run('2026-01-01T00:20:00Z', 'succeeded'))).toBe('true');
      expect(healed('ml_job', run('2026-01-01T00:05:00Z', 'succeeded'))).toBe('false');
    });

    it('does not wait for the next run of a disabled rule', () => {
      expect(review.step('wait_for_next_run').if).toContain("kind != 'disable'");
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

  // The rule-doctor skill in security_solution pins the same list.
  it('accepts exactly the fix types the rule-doctor skill returns', () => {
    const diagnose = review.step('diagnose_rule') as YamlStep & {
      with: { schema: { oneOf: Array<{ properties: { fix_type: { const: string } } }> } };
    };
    expect(diagnose.with.schema.oneOf.map((arm) => arm.properties.fix_type.const)).toEqual([
      'index',
      'query',
      'timestamp_override',
      'suppression',
      'threat_index',
      'lookback',
      'max_signals',
      'data_view',
      'group_fields',
      'ml_job',
      'disable',
      'none',
    ]);
  });

  it('runs the agent on the rule-doctor skill only', () => {
    const overrides = review.step('diagnose_rule').with?.configuration_overrides as Record<
      string,
      unknown
    >;
    expect(overrides.tools).toEqual([]);
    expect(overrides.skill_ids).toEqual(['rule-doctor']);
    expect(review.step('diagnose_rule').with?.message).toContain('skill://rule-doctor');
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

describe('start machine learning jobs action', () => {
  const action = load(ALERTZERO_ACTION_START_ML_JOBS_WORKFLOW.yaml);
  const modules = [
    { id: 'security_auth', defaultIndexPattern: 'logs-*', jobs: [{ id: 'auth_rare_user' }] },
    { id: 'security_linux_v3', defaultIndexPattern: 'logs-*', jobs: [{ id: 'v3_rare_process' }] },
  ];
  const resolve = (field: string, missing: string) =>
    render(action.step('resolve_modules').with?.[field], {
      steps: { resolve_missing: { output: { ids: missing } }, list_modules: { output: modules } },
    });

  it('installs only the modules that ship a missing job', () => {
    expect(resolve('modules', ',v3_rare_process')).toBe(';security_linux_v3|logs-*');
  });

  it('names the jobs no module ships', () => {
    expect(resolve('unknown', ',v3_rare_process,custom_job')).toBe('custom_job');
  });

  it('lists the jobs that do not exist yet', () => {
    const ids = render(action.step('resolve_missing').with?.ids, {
      inputs: { actionInput: { job_ids: ['a', 'b'] } },
      steps: { jobs_exist: { output: { a: { exists: true }, b: { exists: false } } } },
    });
    expect(ids).toBe(',b');
  });

  it('reports a datafeed that did not start', () => {
    const failed = render(action.step('resolve_started').with?.failed, {
      inputs: { actionInput: { job_ids: ['a', 'b'] } },
      steps: {
        start_datafeeds: {
          output: {
            'datafeed-a': { started: true },
            'datafeed-b': { started: false, error: 'no ML node' },
          },
        },
      },
    });
    expect(failed).toBe('b: no ML node;');
  });
});

describe('disable rule action', () => {
  const action = load(ALERTZERO_ACTION_DISABLE_RULE_WORKFLOW.yaml);

  it('turns the rule off only when it is on', () => {
    expect(action.step('disable_rule').type).toBe('security.disableRule');
    expect(action.step('disable_rule').if).toContain('enabled == true');
  });

  // An edit since the proposal may have fixed the rule.
  it('refuses a rule that changed since the proposal', () => {
    expect(action.step('fail_rule_changed').if).toContain('expected_revision');
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
  it.each([
    'index',
    'timestamp_override',
    'threat_index',
    'alert_suppression',
    'from',
    'max_signals',
    'data_view_id',
    'new_terms_fields',
    'threshold',
  ])('lets the edit-rule action change %s', (field) => {
    const patch = load(ALERTZERO_ACTION_EDIT_RULE_WORKFLOW.yaml).step('patch_rule').with?.patch;
    expect(patch).toContain(`'${field}'`);
  });
});
