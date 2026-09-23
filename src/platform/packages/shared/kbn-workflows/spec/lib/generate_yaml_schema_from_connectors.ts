/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod/v4';
import { CONNECTOR_ID_MAX_LENGTH } from '../../common/constants';
import {
  TEMPLATE_EXPRESSION_MAX_LENGTH,
  WHOLE_VALUE_TEMPLATE_EXPRESSION_REGEX,
} from '../../common/template_expressions';
import type { ConnectorContractUnion } from '../../types/v1';
import { getDeprecatedStepMessage, getStepDeprecationInfo } from '../deprecated_step_metadata';
import { KIBANA_TYPE_ALIASES } from '../kibana/aliases';
import {
  BaseConnectorStepSchema,
  DataSetStepSchema,
  getForEachStepSchema,
  getIfStepSchema,
  getMergeStepSchema,
  getOnFailureStepSchema,
  getParallelStepSchema,
  getSwitchStepSchema,
  getWhileStepSchema,
  getWorkflowSettingsSchema,
  LoopBreakStepSchema,
  LoopContinueStepSchema,
  WaitForApprovalStepSchema,
  WaitForInputStepSchema,
  WaitStepSchema,
  WorkflowExecuteAsyncStepSchema,
  WorkflowExecuteStepSchema,
  WorkflowFailStepSchema,
  WorkflowOutputStepSchema,
  WorkflowSchemaBase,
  WorkflowSchemaForAutocompleteBase,
  WorkflowSettingsSchema,
} from '../schema';
import { type CustomTriggerSchemaInput, getTriggerSchema } from '../schema/triggers';

export function getStepId(stepName: string): string {
  // Using step name as is, don't do any escaping to match the workflow engine behavior
  // Leaving this function in case we'd to change behaviour in future.
  return stepName;
}

export function generateYamlSchemaFromConnectors(
  connectors: ConnectorContractUnion[],
  /** Registered custom triggers for YAML schema validation (id, optional requiresConnectorId) */
  triggers: CustomTriggerSchemaInput[] = [],
  /**
   * @deprecated use WorkflowSchemaForAutocomplete instead
   */
  loose: boolean = false
): z.ZodType {
  const recursiveStepSchema = createRecursiveStepSchema(connectors, loose);

  if (loose) {
    // For loose mode, use WorkflowSchemaForAutocompleteBase which already handles partial fields
    // We use the base schema (without transform) so we can extend it
    return WorkflowSchemaForAutocompleteBase.extend({
      settings: WorkflowSettingsSchema.optional(),
      steps: z.array(recursiveStepSchema).optional(),
    }).transform((data) => ({
      ...data,
      version: '1' as const,
    }));
  }

  const triggerSchema = getTriggerSchema(triggers);
  const workflowBaseWithTriggers = WorkflowSchemaBase.extend({
    triggers: z.array(triggerSchema).min(1),
  });

  return workflowBaseWithTriggers.extend({
    settings: getWorkflowSettingsSchema(recursiveStepSchema, loose).optional(),
    steps: z.array(recursiveStepSchema).min(1),
  });
}

/**
 * Generates a schema for trusted workflow definitions that need the shared workflow envelope
 * validation without materializing the connector-expanded step union.
 */
export function generateLightweightYamlSchema(
  triggers: CustomTriggerSchemaInput[] = []
): z.ZodType {
  // Trigger schemas are lightweight: custom IDs add literal trigger variants and do
  // not materialize connector or step-definition schemas.
  const triggerSchema = getTriggerSchema(triggers);
  const workflowBaseWithTriggers = WorkflowSchemaBase.extend({
    triggers: z.array(triggerSchema).min(1),
  });

  return workflowBaseWithTriggers.extend({
    // WorkflowSchemaBase validates settings with step-aware fallback schemas. Keep the
    // trusted startup path step-agnostic so it does not duplicate the step schema SOT.
    settings: z.unknown().optional(),
    steps: z.array(z.unknown()).min(1),
  });
}

function createRecursiveStepSchema(
  connectors: ConnectorContractUnion[],
  loose: boolean = false
): z.ZodType {
  // Build the discriminated union exactly once: Zod calls the lazy getter on
  // every traversal (z.toJSONSchema, .safeParse, monaco-yaml's AJV walk), and
  // each connector references stepSchema again via `on-failure.fallback`, so
  // without the cache the 200+ entry union would be rebuilt on every visit.
  let cachedUnion: z.ZodType | undefined;
  const stepSchema: z.ZodType = z.lazy(() => {
    if (cachedUnion) {
      return cachedUnion;
    }

    const forEachSchema = getForEachStepSchema(stepSchema, loose);
    const whileSchema = getWhileStepSchema(stepSchema, loose);
    const ifSchema = getIfStepSchema(stepSchema, loose);
    const switchSchema = getSwitchStepSchema(stepSchema, loose);
    const parallelSchema = getParallelStepSchema(stepSchema, loose);
    const mergeSchema = getMergeStepSchema(stepSchema, loose);

    const connectorSchemas = connectors.map((c) =>
      generateStepSchemaForConnector(c, stepSchema, loose)
    );

    // Alias schemas keep old type names parseable, but they're not surfaced in
    // autocomplete.
    const aliasSchemas = generateAliasSchemas(connectors, stepSchema, loose);

    cachedUnion = z.discriminatedUnion('type', [
      forEachSchema,
      whileSchema,
      ifSchema,
      switchSchema,
      parallelSchema,
      mergeSchema,
      WaitStepSchema,
      WaitForInputStepSchema,
      WaitForApprovalStepSchema,
      DataSetStepSchema,
      WorkflowExecuteStepSchema,
      WorkflowExecuteAsyncStepSchema,
      WorkflowOutputStepSchema,
      WorkflowFailStepSchema,
      LoopBreakStepSchema,
      LoopContinueStepSchema,
      ...connectorSchemas,
      ...aliasSchemas,
    ]);
    return cachedUnion;
  });

  return stepSchema;
}

/**
 * Returns true when a step's params schema has no required fields, meaning `with` can be omitted.
 * This covers steps like `data.parseJson` whose inputs are all optional or entirely absent.
 */
function hasNoRequiredFields(schema: z.ZodType): boolean {
  if (!(schema instanceof z.ZodObject)) return false;
  return Object.values(schema.shape).every(
    (field) => field instanceof z.ZodOptional || field instanceof z.ZodDefault
  );
}

/**
 * Only whole-value `${{ … }}` expressions are accepted — not arbitrary strings, and not the
 * bare `{{ … }}` form, which the templating engine always renders to a string and so can never
 * satisfy an array param. See WHOLE_VALUE_TEMPLATE_EXPRESSION_REGEX for the full rationale.
 */
const LIQUID_TEMPLATE_SCHEMA = z
  .string()
  .regex(WHOLE_VALUE_TEMPLATE_EXPRESSION_REGEX)
  .max(TEMPLATE_EXPRESSION_MAX_LENGTH);

/** Checks attached to a `.optional()` / `.default()` wrapper (e.g. via `.refine()` after it). */
type FieldWrapperChecks = NonNullable<z.ZodOptional['def']['checks']>;

/**
 * Zod types `def.checks` as `$ZodCheck<never>[]`. At runtime they accept the parsed value; this
 * cast is what lets us re-attach them to a differently shaped replay schema.
 */
type ReplayableCheck = z.core.$ZodCheck<unknown>;

const asReplayableChecks = (checks: readonly unknown[]): ReplayableCheck[] =>
  checks as ReplayableCheck[];

/** Replays a Zod issue onto a `.check()` context (`input` is required on the push target). */
const pushIssue = (
  ctx: { value: unknown; issues: Array<Record<string, unknown>> },
  issue: { path?: PropertyKey[]; message?: string; input?: unknown }
): void => {
  ctx.issues.push({
    code: 'custom',
    path: issue.path ?? [],
    message: issue.message ?? '',
    input: issue.input ?? ctx.value,
  });
};

/**
 * A `.optional()` / `.default()` layer stripped off a params field so it can be replayed verbatim.
 * Defaults keep a getter rather than a captured value: in Zod v4, `def.defaultValue` evaluates a
 * factory (or shallow-clones a static value) on every read, so reading it once at unwrap time would
 * freeze that result into every subsequent parse. Wrapper-level checks are carried along so a
 * refinement applied after `.optional()` / `.default()` is not dropped when the inner array is
 * replaced with `array | template`.
 */
type FieldWrapper =
  | { kind: 'optional'; checks: FieldWrapperChecks }
  | { kind: 'default'; getValue: () => unknown; checks: FieldWrapperChecks };

/**
 * Strips the `.optional()` / `.default()` layers off a params field, returning the wrapped type
 * together with the layers in outermost-first order.
 */
function unwrapFieldWrappers(field: z.ZodType): { inner: z.ZodType; wrappers: FieldWrapper[] } {
  const wrappers: FieldWrapper[] = [];
  let inner = field;
  while (inner instanceof z.ZodOptional || inner instanceof z.ZodDefault) {
    const checks = (inner.def.checks ?? []) as FieldWrapperChecks;
    if (inner instanceof z.ZodOptional) {
      wrappers.push({ kind: 'optional', checks });
    } else {
      const zodDefault = inner;
      wrappers.push({ kind: 'default', getValue: () => zodDefault.def.defaultValue, checks });
    }
    inner = inner.unwrap() as z.ZodType;
  }
  return { inner, wrappers };
}

/**
 * Re-applies checks that lived on an optional/default wrapper. Template strings skip them: those
 * checks are written against `array | undefined` (or the defaulted array), and array APIs throw a
 * TypeError that escapes `safeParse` when handed a Liquid expression.
 */
function applyWrapperChecks(field: z.ZodType, checks: FieldWrapperChecks): z.ZodType {
  if (checks.length === 0) {
    return field;
  }
  const replayable = asReplayableChecks(checks);
  return field.check((ctx) => {
    if (typeof ctx.value === 'string') {
      return;
    }
    const result = z
      .any()
      .check(...replayable)
      .safeParse(ctx.value);
    if (!result.success) {
      for (const issue of result.error.issues) {
        pushIssue(ctx, issue);
      }
      return;
    }
    ctx.value = result.data;
  });
}

/**
 * Rebuilds the wrapper stack returned by {@link unwrapFieldWrappers} in its original order.
 * The order is load-bearing: coalescing the layers into "optional, then default" would collapse
 * stacked defaults onto the innermost value instead of the outermost one that Zod actually applies.
 */
function rewrapField(field: z.ZodType, wrappers: FieldWrapper[]): z.ZodType {
  // `wrappers` is outermost-first, so replay it back-to-front to end up with the same stack.
  // Pass `getValue` itself into `.default()` so Zod invokes the original supplier per parse.
  return wrappers.reduceRight<z.ZodType>((acc, wrapper) => {
    const rewrapped = wrapper.kind === 'optional' ? acc.optional() : acc.default(wrapper.getValue);
    return applyWrapperChecks(rewrapped, wrapper.checks);
  }, field);
}

/** True when the object carries `.refine()` / `.superRefine()` checks of its own. */
function hasObjectLevelChecks(schema: z.ZodObject): boolean {
  return (schema.def.checks?.length ?? 0) > 0;
}

/**
 * Placeholder for a templated field while replaying object-level checks. Any property access
 * throws so refinements that depend on the unresolved value — including operations that are valid
 * on both arrays and strings, such as `.length` — are skipped, while checks that never touch the
 * field still run.
 */
function unresolvedTemplatePlaceholder(fieldKey: string): unknown {
  return new Proxy(
    {},
    {
      get(_target, prop) {
        throw new TypeError(
          `Cannot evaluate object check against templated field "${fieldKey}" (accessed .${String(
            prop
          )})`
        );
      },
    }
  );
}

function withUnresolvedTemplates(
  value: Record<string, unknown>,
  templatedKeys: string[]
): Record<string, unknown> {
  if (templatedKeys.length === 0) {
    return value;
  }
  const probe: Record<string, unknown> = { ...value };
  for (const key of templatedKeys) {
    probe[key] = unresolvedTemplatePlaceholder(key);
  }
  return probe;
}

/**
 * Re-attaches the object-level checks of `paramsSchema` to the widened object.
 *
 * Those checks are written against the declared field types, so once a field accepts
 * `array | string` a refinement like `(v) => v.ids.every(...)` receives a string and throws a
 * TypeError. That exception escapes `safeParse` and fails the whole create/update request, so the
 * checks cannot simply be preserved as-is. When a widened field holds a template, each check is
 * tried against a probe where templated fields are inaccessible placeholders — checks that touch
 * those fields throw and are skipped (covering both throwing APIs like `.every` and silent ones
 * like `.length`), while checks on unrelated fields still run. Non-templated values run every
 * object-level check against the already-parsed field output (without re-running field schemas,
 * which would re-apply non-idempotent transforms). Successful check output is written back so
 * object-level `.overwrite()` transforms are not discarded.
 */
function deferChecksForTemplateValues(
  paramsSchema: z.ZodObject,
  widenedShape: Record<string, z.ZodType>,
  widenedKeys: string[]
): z.ZodType {
  const rebuilt = z.object({ ...paramsSchema.shape, ...widenedShape });
  // Rebuilding from the shape drops the unknownKeys policy, which lives on `catchall`
  // (`z.never()` for strict objects, `z.unknown()` for loose ones).
  const { catchall } = paramsSchema.def;
  const widened = catchall ? rebuilt.catchall(catchall) : rebuilt;

  // Field schemas already ran in `widened`. Re-parsing through `paramsSchema` would re-apply
  // non-idempotent field transforms (e.g. `.transform(v => v + '!')`) and can reject values the
  // original schema accepts. An empty passthrough object + the original object checks validates
  // the already-parsed output without re-running field schemas or re-requiring keys that were
  // legitimately omitted (a shape of `z.any()` per key would treat every key as required).
  // Passthrough keeps catchall keys that `widened` already accepted.
  const objectChecks = asReplayableChecks(paramsSchema.def.checks ?? []);
  const checksOnlyObject = () => z.object({}).passthrough();
  const outputChecksOnly = checksOnlyObject().check(...objectChecks);

  // Use `.check()` (not `superRefine`) so successful overwrites can replace `ctx.value`;
  // `superRefine` can only add issues and would drop `.overwrite()` output from result.data.
  return widened.check((ctx) => {
    const params = ctx.value as Record<string, unknown>;
    if (!widenedKeys.some((key) => typeof params[key] === 'string')) {
      const result = outputChecksOnly.safeParse(ctx.value);
      if (!result.success) {
        // Replaying path and message keeps the issue pointing at the offending field, which both
        // Monaco markers and the template-error suppression in parseWorkflowYamlToJSON rely on.
        for (const issue of result.error.issues) {
          pushIssue(ctx, issue);
        }
        return;
      }
      ctx.value = result.data;
      return;
    }

    // Template present: do not bail on every object check. Run each check alone against a probe
    // where templated fields throw on access, and skip only those that depend on them. Thread
    // `current` forward so an overwrite that does not touch the templated field still applies.
    const templatedKeys = widenedKeys.filter((key) => typeof params[key] === 'string');
    let current = params;
    for (const check of objectChecks) {
      try {
        const result = checksOnlyObject()
          .check(check)
          .safeParse(withUnresolvedTemplates(current, templatedKeys));
        if (!result.success) {
          for (const issue of result.error.issues) {
            pushIssue(ctx, issue);
          }
        } else {
          // Restore the original template strings — the probe replaced them with placeholders.
          current = { ...(result.data as Record<string, unknown>) };
          for (const key of templatedKeys) {
            current[key] = params[key];
          }
        }
      } catch {
        // Check depended on an unresolved templated field.
      }
    }
    ctx.value = current;
  });
}

/**
 * Widens top-level array fields of a connector params schema to also accept a whole-value
 * Liquid template expression like `"${{ event.messages }}"`, so that passing a templated value
 * where an array is declared is not reported as a type error.
 *
 * This is not editor-only: the same generated schema is the server-side gate for workflow
 * create/update (`workflow_crud_service` / `workflow_validation_service` in
 * workflows_management), so it decides what can be *persisted*, not just what Monaco underlines.
 * The accepted form is restricted to the one the templating engine resolves without stringifying,
 * because connector params are not re-validated against `paramsSchema` at execution time. Note
 * that this preserves the *expression's* type rather than guaranteeing an array: `${{ inputs.x }}`
 * still resolves to whatever `x` holds. Catching that requires validating rendered params before
 * invocation, which the execution engine does not do today.
 *
 * Only the direct children of the params schema (not nested objects) are widened, to avoid
 * disturbing deeply nested schemas such as the ES API's MappingTypeMapping.
 */
function withTemplateStringSupport(paramsSchema: z.ZodType): z.ZodType {
  if (!(paramsSchema instanceof z.ZodObject)) {
    return paramsSchema;
  }
  const widenedShape: Record<string, z.ZodType> = {};
  for (const [key, field] of Object.entries(paramsSchema.shape as Record<string, z.ZodType>)) {
    const { inner, wrappers } = unwrapFieldWrappers(field);
    if (inner instanceof z.ZodArray) {
      // Re-apply the wrappers that were stripped above. Dropping `.default()` here would turn a
      // defaulted param into a required one and break workflows that legitimately omit it.
      widenedShape[key] = rewrapField(z.union([LIQUID_TEMPLATE_SCHEMA, inner]), wrappers);
    }
  }

  const widenedKeys = Object.keys(widenedShape);
  if (widenedKeys.length === 0) {
    return paramsSchema;
  }

  if (hasObjectLevelChecks(paramsSchema)) {
    return deferChecksForTemplateValues(paramsSchema, widenedShape, widenedKeys);
  }

  // safeExtend preserves the unknownKeys policy (strict/passthrough), unlike extend().
  // `widenedShape` is built as a mutable record; ZodRawShape is the readonly shape safeExtend
  // expects, so the cast only relaxes mutability.
  return paramsSchema.safeExtend(widenedShape as z.ZodRawShape);
}

function generateStepSchemaForConnector(
  connector: ConnectorContractUnion,
  stepSchema: z.ZodType,
  loose: boolean = false
) {
  const connectorIdSchema: Record<string, z.ZodType> = {};
  // Add connector-id schema if hasConnectorId has a value
  if (connector.hasConnectorId) {
    const connectorId = z.string().max(CONNECTOR_ID_MAX_LENGTH);
    connectorIdSchema['connector-id'] =
      connector.hasConnectorId === 'required' ? connectorId : connectorId.optional();
  }

  const templateAwareParamsSchema = withTemplateStringSupport(connector.paramsSchema);

  // If all params are optional (or there are none), `with` itself should be optional so users
  // don't have to write an empty `with: {}` block for steps that need no inputs.
  const withSchema = hasNoRequiredFields(connector.paramsSchema)
    ? templateAwareParamsSchema.optional()
    : templateAwareParamsSchema;

  return BaseConnectorStepSchema.extend({
    type: connector.description
      ? z.literal(connector.type).describe(connector.description)
      : z.literal(connector.type),
    with: withSchema,
    ...connectorIdSchema,
    'on-failure': getOnFailureStepSchema(stepSchema, loose).optional(),
    ...(connector.configSchema && connector.configSchema.shape),
  });
}

/**
 * Generate schemas for backward-compatible type aliases.
 * These schemas use the old type names but reference the same connector definition.
 * They are included in validation but not shown in autocomplete suggestions.
 */
function generateAliasSchemas(
  connectors: ConnectorContractUnion[],
  stepSchema: z.ZodType,
  loose: boolean = false
): ReturnType<typeof generateStepSchemaForConnector>[] {
  const aliasSchemas: ReturnType<typeof generateStepSchemaForConnector>[] = [];

  for (const [oldType, newType] of Object.entries(KIBANA_TYPE_ALIASES)) {
    // Find the connector with the new type name
    const connector = connectors.find((c) => c.type === newType);
    if (connector) {
      // Create a schema with the old type name but same params/output
      const newSchema = generateStepSchemaForConnector(connector, stepSchema, loose);
      const deprecation = getStepDeprecationInfo(oldType);
      const description = deprecation
        ? getDeprecatedStepMessage(oldType, deprecation)
        : `Deprecated: Use ${newType} instead`;
      aliasSchemas.push(
        newSchema.extend({
          // Mark as deprecated in description so it's clear this is a legacy alias
          type: z.literal(oldType).describe(description),
        })
      );
    }
  }

  return aliasSchemas;
}
