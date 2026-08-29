/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { parse } from 'yaml';
import type { z } from '@kbn/zod/v4';

import { PND_WORKFLOW_TEMPLATE_VALUES_BY_ID } from '.';
import type { PndWatchTemplateValues } from '.';
import { managedWorkflowDefinitions } from '..';
import { createWorkflowLiquidEngine } from '../../../common/utils/create_workflow_liquid_engine/create_workflow_liquid_engine';
import { validateStepNameUniqueness } from '../../../common/validate_step_names';
import { WorkflowGraph } from '../../../graph';
import { generateLightweightYamlSchema } from '../../../spec/lib/generate_yaml_schema_from_connectors';
import type { WorkflowYaml } from '../../../spec/schema';
import type { ManagedWorkflowDefinition } from '../../types';

/**
 * ## Why this file exists (PND finding R7)
 *
 * A managed workflow whose YAML fails validation is **installed anyway**, as
 * `valid: false, enabled: false, triggerTypes: []`, and Kibana emits **no log line at all** about
 * it. The workflow then never triggers, never appears in the Watch catalog, and never produces a
 * step execution — so a one-character typo in one of these files presents *identically* to "the
 * feature does not work". That silent mode is why these assertions are worth more than their size
 * suggests.
 *
 * ## What "the real schema" means here
 *
 * The managed-install path is `ManagedWorkflowsService.buildManagedWorkflowData` →
 * `WorkflowCrudService.prepareWorkflowDocumentForStorage({ lightweightValidation: true })` →
 * `prepareWorkflowDocumentFromYaml` → `validateWorkflowYaml(yaml, zodSchema)`, where `zodSchema` is
 * `getWorkflowZodSchema({}, registeredTriggerIds, { lightweight: true })` — which returns exactly
 * {@link generateLightweightYamlSchema}, imported below. `triggerDefinitions` is `undefined` on that
 * path, so `validateWorkflowYaml`'s `validateTriggers` branch never runs; its remaining error
 * sources are the schema parse, {@link validateStepNameUniqueness}, the {@link WorkflowGraph} build,
 * and `validateLiquidTemplate` — one assertion each, below.
 *
 * `validateWorkflowYaml` itself lives in the `workflows_management` **plugin**, which this package
 * cannot import (`@kbn/workflows-yaml` already depends on `@kbn/workflows`, so the reverse edge
 * would be a cycle). Every check below therefore drives the engine's own exported validator rather
 * than re-describing the expected shape by hand: a hand-rolled shape check would happily pass on
 * precisely the definitions the engine rejects.
 *
 * ## The one thing this cannot catch
 *
 * `generateLightweightYamlSchema` types `steps` as `z.array(z.unknown())`, because the
 * connector-expanded step union is only materialized for user-authored workflows. A malformed
 * *step* — a misspelled `kibana.request` param, or a step with no `type` at all — is therefore
 * `valid: true` to the engine at install time and fails only when the step runs. Reproducing the
 * full union here is not possible either: `ai.agent` is contributed at runtime by the agentBuilder
 * plugin, so a union built from this package's connectors would reject the very steps these
 * definitions rely on. Step bodies still need a real execution to prove.
 */

/** Marks a managed workflow definition as PND-owned. Matches `pluginId` in `./index.ts`. */
const PND_PLUGIN_ID = 'pnd';

/**
 * Custom (event-driven) trigger type ids that the `pnd` and `discoveries` plugins register with
 * `workflowsExtensions`, and that the engine therefore feeds to the schema factory as
 * `registeredTriggerIds`. Restated as literals because `@kbn/workflows` is `group: platform` and the
 * declaring constants live in `group: security` packages, which
 * `@kbn/imports/no_group_crossing_imports` forbids importing. Sources of truth:
 * `x-pack/solutions/security/plugins/pnd/common/workflow_triggers/incident_closed.ts`,
 * `x-pack/solutions/security/packages/kbn-pnd-common/impl/workflow_triggers/detection_change_signal/index.ts`
 * and
 * `x-pack/solutions/security/plugins/discoveries/common/workflow_triggers/attack_discovery_created/index.ts`.
 *
 * A trigger type missing from this list is not a cosmetic gap: the schema is a DISCRIMINATED UNION on
 * `triggers[].type`, so an unregistered id makes the whole definition invalid — which is the silent
 * `valid: false, enabled: false` install this file exists to catch.
 */
const PND_REGISTERED_TRIGGER_TYPES = [
  'pnd.incidentClosed',
  'security.attackDiscoveryCreated',
  'security.detectionChangeSignal',
];

const MANAGED_INSTALL_SCHEMA = generateLightweightYamlSchema(PND_REGISTERED_TRIGGER_TYPES);

/**
 * The same options `kbn-workflows-yaml`'s shared Liquid instance is built with. `strictVariables`
 * must stay `false`: it is why a missing step output renders `''` instead of throwing, and
 * validating with it on would fail every one of these definitions.
 */
const LIQUID_ENGINE = createWorkflowLiquidEngine({ strictFilters: true, strictVariables: false });

/**
 * Every PND definition, enumerated from the registry the plugin actually installs rather than from
 * a hardcoded list, so a seventh watch is covered the moment it is registered. The registry — not a
 * `readdirSync` of this directory — is the enumeration source because `import/no-nodejs-modules` is
 * `error` across `kbn-workflows`, and because a `.yaml` that no definition imports is never built,
 * never installed, and therefore has nothing to validate.
 */
const pndDefinitions: Array<[id: string, definition: ManagedWorkflowDefinition]> =
  managedWorkflowDefinitions
    .filter(({ pluginId }) => pluginId === PND_PLUGIN_ID)
    .map((definition) => [definition.id, definition]);

/** Renders zod issues as `path: message`, which reads far better than a nested diff. */
const formatIssues = (error: z.ZodError): string[] =>
  error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`);

/**
 * Renders a PND definition's YAML the way the managed-install path does.
 *
 * Deliberately does **not** fall back to a static `yaml` property: decision 7 put every PND
 * definition on `yamlTemplate`, so a definition that still declares `yaml` is the regression this
 * throw exists to name. `PND_WORKFLOW_TEMPLATE_VALUES_BY_ID` is what the plugin installs with —
 * per-definition defaults, because the Attack Discovery Generation watch reads real values (its
 * scheduled-trigger interval among them) where the other templates ignore what they are handed.
 */
const templateValuesById = PND_WORKFLOW_TEMPLATE_VALUES_BY_ID as Record<
  string,
  PndWatchTemplateValues | undefined
>;

const getYaml = ({ id, yamlTemplate }: ManagedWorkflowDefinition): string => {
  if (typeof yamlTemplate !== 'function') {
    throw new Error(
      `PND managed workflow '${id}' does not declare a yamlTemplate. Every PND definition must use yamlTemplate rather than yaml (decision 7).`
    );
  }

  const templateValues = templateValuesById[id];
  if (!templateValues) {
    throw new Error(
      `PND managed workflow '${id}' has no entry in PND_WORKFLOW_TEMPLATE_VALUES_BY_ID. Every PND definition must declare its install-time template values.`
    );
  }

  return yamlTemplate(templateValues);
};

const parseDefinition = (definition: ManagedWorkflowDefinition): WorkflowYaml => {
  const result = MANAGED_INSTALL_SCHEMA.safeParse(parse(getYaml(definition)));

  if (!result.success) {
    throw new Error(formatIssues(result.error).join('\n'));
  }

  return result.data as WorkflowYaml;
};

/** Every string value in the definition, at any depth. Mirrors the scalar walk of the validator. */
const collectStringValues = (value: unknown): string[] => {
  if (typeof value === 'string') {
    return [value];
  }

  if (Array.isArray(value)) {
    return value.flatMap(collectStringValues);
  }

  if (value !== null && typeof value === 'object') {
    return Object.values(value).flatMap(collectStringValues);
  }

  return [];
};

const parseLiquidTemplate = (template: string): string[] => {
  try {
    LIQUID_ENGINE.parse(template);
    return [];
  } catch (error) {
    return [`${template}\n  → ${error instanceof Error ? error.message : String(error)}`];
  }
};

describe('PND managed workflow definitions', () => {
  it('enumerates the PND definitions from the managed workflow registry', () => {
    expect(pndDefinitions.length).toBeGreaterThan(0);
  });

  it.each(pndDefinitions)('%s passes the managed-install workflow schema', (_id, definition) => {
    const result = MANAGED_INSTALL_SCHEMA.safeParse(parse(getYaml(definition)));

    expect(result.success ? [] : formatIssues(result.error)).toEqual([]);
  });

  it.each(pndDefinitions)('%s declares at least one trigger type', (_id, definition) => {
    const { triggers } = parseDefinition(definition);

    expect(triggers.map(({ type }) => type)).not.toHaveLength(0);
  });

  it.each(pndDefinitions)('%s has no duplicate step names', (_id, definition) => {
    const { errors } = validateStepNameUniqueness(parseDefinition(definition));

    expect(errors.map(({ message }) => message)).toEqual([]);
  });

  it.each(pndDefinitions)('%s compiles into an execution graph', (_id, definition) => {
    const parsed = parseDefinition(definition);

    expect(() => WorkflowGraph.fromWorkflowDefinition(parsed)).not.toThrow();
  });

  it.each(pndDefinitions)('%s has parseable Liquid templates', (_id, definition) => {
    const templates = collectStringValues(parse(getYaml(definition))).filter(
      (value) => value.includes('{{') || value.includes('{%')
    );

    expect(templates.flatMap(parseLiquidTemplate)).toEqual([]);
  });
});
