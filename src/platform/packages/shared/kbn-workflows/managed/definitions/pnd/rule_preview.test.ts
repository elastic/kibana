/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { parse } from 'yaml';

import { PND_RULE_PREVIEW_WORKFLOW, PND_WORKFLOW_TEMPLATE_VALUES } from '.';
import { createWorkflowLiquidEngine } from '../../../common/utils/create_workflow_liquid_engine/create_workflow_liquid_engine';

/**
 * Fields a composed preview body must never carry, however faithful a passthrough would feel.
 *
 * `run_rule_preview.ts` builds the preview rule as `{ ...internalRule, enabled: true, actions:
 * internalRule.actions }` and runs it with `shouldWriteAlerts: () => true`. Actions are not scheduled
 * on that path — the rule type's executor is invoked directly, bypassing the task runner that
 * schedules them — but "does not currently notify" is a weaker property than "cannot notify", and a
 * backtest is exactly the place to insist on the stronger one. `enabled` and `throttle` are here for
 * the same reason: neither means anything to a preview, and forwarding a field whose only possible
 * effect is a side effect is how a measurement grows one.
 */
const FORBIDDEN_PREVIEW_BODY_FIELDS = ['actions', 'enabled', 'throttle'];

interface ParsedInputProperty {
  type?: string;
  description?: string;
  additionalProperties?: boolean;
}

interface ParsedTriggerInputs {
  properties?: Record<string, ParsedInputProperty>;
  required?: string[];
  additionalProperties?: boolean;
}

interface ParsedTrigger {
  type: string;
  inputs?: ParsedTriggerInputs;
}

interface ParsedStep {
  name: string;
  type: string;
  if?: string;
  'on-failure'?: { continue?: boolean | string };
  with?: {
    body?: string;
    preview_body?: Record<string, unknown>;
    [key: string]: unknown;
  };
}

interface ParsedWorkflow {
  steps?: ParsedStep[];
  triggers?: ParsedTrigger[];
}

// `yamlTemplate` rather than `yaml`: decision 7 moved every PND definition onto a template that
// ignores the values it is handed. See the comment at the top of `./index.ts`.
const parsed = parse(
  PND_RULE_PREVIEW_WORKFLOW.yamlTemplate(PND_WORKFLOW_TEMPLATE_VALUES)
) as ParsedWorkflow;

const getStep = (name: string): ParsedStep => {
  const step = (parsed.steps ?? []).find((s) => s.name === name);
  if (!step) {
    throw new Error(`No '${name}' step found in Detection rule preview workflow`);
  }
  return step;
};

const manualTriggerInputs = (): ParsedTriggerInputs =>
  (parsed.triggers ?? []).find(({ type }) => type === 'manual')?.inputs ?? {};

/** The `preview_body` object `compose_preview_body` builds, as authored. */
const composedBody = (): Record<string, unknown> =>
  (getStep('compose_preview_body').with?.preview_body ?? {}) as Record<string, unknown>;

/**
 * Renders a template the way the execution engine does: `WorkflowTemplatingEngine`
 * (`workflows_execution_engine/server/templating_engine.ts`) builds the shared engine with
 * `strictFilters: true` and `strictVariables: false`. The non-strict variables are the whole point
 * here — they are why a missing rule field falls through to a `default:` instead of throwing, and
 * rendering with any other options would prove nothing about the real path.
 */
const render = (template: unknown, context: Record<string, unknown>): string =>
  createWorkflowLiquidEngine({ strictFilters: true, strictVariables: false }).parseAndRenderSync(
    typeof template === 'string' ? template : '',
    context
  );

/**
 * Evaluates a `${{ … }}` value the way the engine does, returning the real JS value rather than a
 * string. Mirrors `renderValueRecursively` + `evaluateExpression`: the leading `$` is dropped, the
 * outermost `{{`/`}}` are stripped, and what is left goes to `evalValueSync` — which is why a
 * `${{ … }}` field can carry an object, an array or `undefined` instead of text.
 */
const evaluate = (template: unknown, context: Record<string, unknown>): unknown => {
  const trimmed = (typeof template === 'string' ? template : '').trim();
  const open = trimmed.indexOf('{{');
  const close = trimmed.lastIndexOf('}}');

  return createWorkflowLiquidEngine({
    strictFilters: true,
    strictVariables: false,
  }).evalValueSync(trimmed.substring(open + 2, close).trim(), context);
};

/** A rules-API rule with a timestamp override, as `GET /api/detection_engine/rules?id=` returns it. */
const RULE_WITH_OVERRIDE = {
  description: 'Endpoint alerts, seeded',
  from: 'now-600s',
  id: '7b75f973-e958-4a09-bc49-6dd05d88e7e4',
  index: ['insights-alerts-*'],
  interval: '5m',
  language: 'kuery',
  name: 'Endpoint Security [Insights]',
  query: 'event.kind:alert and event.module:(endpoint and not endgame)',
  risk_score: 47,
  severity: 'medium',
  timestamp_override: 'event.ingested',
  to: 'now',
  type: 'query',
};

/** The same rule with no override, which is the majority case and the one that regresses easily. */
const RULE_WITHOUT_OVERRIDE = {
  ...RULE_WITH_OVERRIDE,
  timestamp_override: undefined,
};

// The fetch-from-rule mode this bead adds. It exists because a preview body composed by the CALLER
// is a body every caller has to get right: the 13-field block in `watch_post_incident.yaml` was a
// field-for-field copy of the one in `rule_tuning.yaml` (#283488), and neither carried
// `timestamp_override` — so both measured on `@timestamp` while the rule they were backtesting ran
// on its own override. Composition lives here now, once, and the callers pass the rule.
describe('rule_preview.yaml fetch-from-rule mode', () => {
  describe('inputs', () => {
    it('accepts a rule object', () => {
      expect(manualTriggerInputs().properties?.rule?.type).toBe('object');
    });

    it('accepts a query override, so one composition serves both sides of a backtest', () => {
      expect(manualTriggerInputs().properties?.query_override?.type).toBe('string');
    });

    it('accepts the invocation count, which used to travel inside the caller-built body', () => {
      expect(manualTriggerInputs().properties?.invocation_count?.type).toBe('number');
    });

    it('accepts the timeframe end, which used to travel inside the caller-built body', () => {
      expect(manualTriggerInputs().properties?.timeframe_end?.type).toBe('string');
    });

    // The additive half of the change, and the reason #283488's three call sites need no edit:
    // `rule_tuning.yaml` (twice) and `rule_creation.yaml` still pass a literal body, and
    // `rule_creation` always will — it previews a rule that does not exist yet, so there is no rule
    // to compose from.
    it('still accepts a literal preview body, so the existing call sites keep working', () => {
      expect(manualTriggerInputs().properties?.preview_body?.type).toBe('object');
    });

    // Two modes cannot both be required. Correctness moves from the schema to the `if` guards below,
    // which is a real loss of enforcement and the reason those guards are pinned here.
    it('requires only the space, because the body may arrive either way', () => {
      expect(manualTriggerInputs().required).toEqual(['space_id']);
    });
  });

  describe('compose_preview_body', () => {
    it('composes with data.set rather than a request, so the worker stays a pure function', () => {
      expect(getStep('compose_preview_body').type).toBe('data.set');
    });

    it('runs only when a rule was passed', () => {
      expect(getStep('compose_preview_body').if).toContain('inputs.rule.id != blank');
    });

    // `nil != ''` is TRUE in Liquid, so the `''` spelling fails open on exactly the literal-body
    // calls this guard exists to skip.
    it('guards with blank rather than the empty string, which fails open on nil', () => {
      expect(getStep('compose_preview_body').if).not.toContain("!= ''");
    });

    it('takes every rule field from the rule rather than from the caller', () => {
      expect(composedBody().name).toBe('{{ inputs.rule.name }}');
      expect(composedBody().description).toBe('{{ inputs.rule.description }}');
      expect(composedBody().language).toBe('{{ inputs.rule.language }}');
      expect(composedBody().type).toBe('{{ inputs.rule.type }}');
    });

    // `${{ }}` rather than `{{ }}`: these are an array and a number, and the string form would
    // stringify them.
    it('preserves the non-string rule fields as values rather than text', () => {
      expect(composedBody().index).toBe('${{ inputs.rule.index }}');
      expect(composedBody().risk_score).toBe('${{ inputs.rule.risk_score }}');
    });

    it('takes the preview window from the caller, since only the caller knows it', () => {
      expect(composedBody().invocationCount).toBe('${{ inputs.invocation_count }}');
      expect(composedBody().timeframeEnd).toBe('{{ inputs.timeframe_end }}');
    });

    it('measures the rule as-is when no override was passed', () => {
      expect(render(composedBody().query, { inputs: { rule: RULE_WITH_OVERRIDE } })).toBe(
        RULE_WITH_OVERRIDE.query
      );
    });

    it('measures the override when one was passed', () => {
      expect(
        render(composedBody().query, {
          inputs: {
            query_override: 'event.kind:alert and host.name:*-PRIV',
            rule: RULE_WITH_OVERRIDE,
          },
        })
      ).toBe('event.kind:alert and host.name:*-PRIV');
    });
  });

  // The defect this bead fixes. The preview API reads the rule's time semantics off the BODY, and a
  // body with no `timestamp_override` is a body that matches on `@timestamp` — so a rule that only
  // ever fires because of its override was backtested over a window in which its documents did not
  // exist, and the approver read that count as the measured effect of the proposed query.
  describe('timestamp semantics', () => {
    it('forwards the timestamp override the rule itself declares', () => {
      expect(
        render(composedBody().timestamp_override, { inputs: { rule: RULE_WITH_OVERRIDE } })
      ).toBe('event.ingested');
    });

    /**
     * ⚠️ The fallback is `'@timestamp'` and NOT the empty string, and the difference is a regression
     * rather than a nicety.
     *
     * `create_security_rule_type_wrapper.ts` reads `timestampOverride ?? TIMESTAMP` — **nullish**,
     * not falsy — so an empty string becomes the primary timestamp field and the backtest queries a
     * field named `''`. That would break every rule *without* an override, which is most of them.
     *
     * `'@timestamp'` is instead provably identical to omitting the field: `TIMESTAMP` IS
     * `'@timestamp'`, so `primaryTimestamp === TIMESTAMP`, which makes `secondaryTimestamp`
     * `undefined`, which makes the runtime-field branch (`secondaryTimestamp && timestampOverride`)
     * false, which leaves `aggregatableTimestampField` at `'@timestamp'` with no runtime mappings.
     * That is the no-override path, exactly.
     */
    it('falls back to @timestamp, never to an empty string, when the rule has no override', () => {
      expect(
        render(composedBody().timestamp_override, { inputs: { rule: RULE_WITHOUT_OVERRIDE } })
      ).toBe('@timestamp');
    });

    it('forwards the fallback-disabled flag as a boolean', () => {
      expect(
        evaluate(composedBody().timestamp_override_fallback_disabled, {
          inputs: { rule: { ...RULE_WITH_OVERRIDE, timestamp_override_fallback_disabled: true } },
        })
      ).toBe(true);
    });

    it('resolves the fallback-disabled flag to false when the rule does not set it', () => {
      expect(
        evaluate(composedBody().timestamp_override_fallback_disabled, {
          inputs: { rule: RULE_WITH_OVERRIDE },
        })
      ).toBe(false);
    });
  });

  describe('side-effect fields', () => {
    it.each(FORBIDDEN_PREVIEW_BODY_FIELDS)('never composes %s into the body', (field) => {
      expect(composedBody()).not.toHaveProperty(field);
    });
  });

  describe('preview_rule', () => {
    it('prefers the composed body', () => {
      expect(
        evaluate(getStep('preview_rule').with?.body, {
          inputs: { preview_body: { name: 'literal' } },
          steps: { compose_preview_body: { output: { preview_body: { name: 'composed' } } } },
        })
      ).toEqual({ name: 'composed' });
    });

    // The whole additive claim in one assertion: when `compose_preview_body` is skipped its output
    // path resolves to `undefined`, and Liquid's `default:` replaces `undefined` — so #283488's
    // literal-body callers reach the API with exactly the body they sent. (`default:` and not
    // `unless`: `''` is truthy in `unless`, so that spelling would drop a literal body.)
    it('falls back to the literal body, so a caller that composed nothing is unaffected', () => {
      expect(
        evaluate(getStep('preview_rule').with?.body, {
          inputs: { preview_body: { name: 'literal' } },
          steps: {},
        })
      ).toEqual({ name: 'literal' });
    });
  });

  // The silent-zero race. Preview alerts are written with `refresh: false`
  // (`create_security_rule_type_wrapper.ts`: `const refresh = isPreview ? false : true`), which is why
  // the FTR helper `getPreviewAlerts` calls `refreshIndex` before it counts. A plain search right after
  // the preview races ES's 1s auto-refresh interval, and a lost race reads as `alert_count: 0` — which
  // is indistinguishable from "the query matched nothing", so it can hand an approver a real proposal
  // whose backtest reads zero.
  describe('zero-count recount', () => {
    const ZERO_COUNT_GUARD = 'steps.count_preview_alerts.output.hits.total.value == 0';

    it('waits only when the first count read zero, so a measured run pays no latency', () => {
      expect(getStep('wait_for_preview_refresh').type).toBe('wait');
      expect(getStep('wait_for_preview_refresh').if).toContain(ZERO_COUNT_GUARD);
    });

    it('waits long enough to clear the default refresh interval', () => {
      expect(getStep('wait_for_preview_refresh').with?.duration).toBe('2s');
    });

    it('recounts only when the first count read zero', () => {
      expect(getStep('recount_preview_alerts').type).toBe('elasticsearch.search');
      expect(getStep('recount_preview_alerts').if).toContain(ZERO_COUNT_GUARD);
    });

    // Identical by assertion rather than by inspection: a recount that searched anything else would
    // report a number that is not the one the first count failed to see.
    it('recounts exactly what it counted', () => {
      const { name: _countName, if: _countIf, ...count } = getStep('count_preview_alerts');
      const { name: _recountName, if: _recountIf, ...recount } = getStep('recount_preview_alerts');

      expect(recount).toEqual(count);
    });

    it('never lets a failed recount abort the preview', () => {
      expect(getStep('recount_preview_alerts')['on-failure']?.continue).toBe(true);
    });

    it('waits before it recounts', () => {
      const names = (parsed.steps ?? []).map(({ name }) => name);

      expect(names.indexOf('wait_for_preview_refresh')).toBeLessThan(
        names.indexOf('recount_preview_alerts')
      );
      expect(names.indexOf('count_preview_alerts')).toBeLessThan(
        names.indexOf('wait_for_preview_refresh')
      );
    });
  });

  /**
   * The emitted count, proven through the real engine rather than reasoned about.
   *
   * ⚠️ The reason the `default:` chain is safe is NOT that "a zero would be replaced anyway". For
   * liquidjs's `default:`, **`0` is truthy** — only `nil`, `false` and *empty* (`''`, `[]`) are
   * replaced. So a recount that legitimately confirms zero emits `0`, and only a genuinely absent
   * measurement reaches `-1`. Each row below is asserted, because a future edit that reorders the
   * chain or swaps in `| default: 0` would break exactly one of them.
   */
  describe('emitted alert_count', () => {
    const alertCount = (context: Record<string, unknown>): unknown =>
      evaluate(getStep('emit_result').with?.alert_count, context);

    const withCounts = (recount: number | undefined, count: number | undefined) => ({
      steps: {
        ...(count === undefined
          ? {}
          : { count_preview_alerts: { output: { hits: { total: { value: count } } } } }),
        ...(recount === undefined
          ? {}
          : { recount_preview_alerts: { output: { hits: { total: { value: recount } } } } }),
      },
    });

    it('emits a zero the recount confirmed, rather than discarding it', () => {
      expect(alertCount(withCounts(0, 7))).toBe(0);
    });

    it('emits the first count when the recount was skipped', () => {
      expect(alertCount(withCounts(undefined, 0))).toBe(0);
      expect(alertCount(withCounts(undefined, 4))).toBe(4);
    });

    it('emits the recount when the race was lost and then won', () => {
      expect(alertCount(withCounts(5, 0))).toBe(5);
    });

    // -1 still means "no measurement", which the Brief renders as `inconclusive` rather than as a
    // measured zero.
    it('emits -1 when neither search produced a count', () => {
      expect(alertCount(withCounts(undefined, undefined))).toBe(-1);
    });
  });

  // `versionStrategy: 'auto'` re-applies the YAML only when the version INCREASES, so a fix that
  // does not bump it never reaches an installed stack and the old body keeps being measured.
  it('bumps the managed version, so the composed body reaches an installed stack', () => {
    expect(PND_RULE_PREVIEW_WORKFLOW.version).toBeGreaterThan(4);
  });
});
