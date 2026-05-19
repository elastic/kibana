/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { JSONSchema7 } from 'json-schema';

/**
 * Prefix for built-in workflow input JSON Schemas resolved by {@link resolveRef}
 * in `field_conversion.ts`. Workflow YAML may use:
 * `$ref: '#/kibana/definitions/<id>'` where `<id>` is a key in
 * {@link builtinWorkflowInputDefinitions}.
 *
 * The same subtree is merged into the workflow root JSON Schema used by Monaco YAML
 * so `#/kibana/definitions/<id>` resolves for validation and completion.
 */
export const KIBANA_WORKFLOW_INPUT_DEFINITION_REF_PREFIX = '#/kibana/definitions/' as const;

/**
 * Alert-rule (stack alerting v2) context shape aligned with `AlertEventSchema` in
 * `schema.ts` (spaceId, rule, alerts, params). Use as a workflow **input** schema when
 * the schedule payload should mirror what alert-triggered workflows receive on `event`.
 */
const alertingRuleV2EventContextV1: JSONSchema7 = {
  type: 'object',
  title: 'Alerting rule (v2) event context',
  description:
    'Subset of the alert trigger event: space, rule metadata, active alerts (alerts-as-data style), and rule params. Pair with an `alert` trigger or pass equivalent data when scheduling.',
  properties: {
    spaceId: {
      type: 'string',
      description: 'Kibana space where the rule executed.',
    },
    rule: {
      type: 'object',
      description: 'Rule metadata (ids, names, tags, consumer, producer, ruleTypeId).',
      properties: {
        id: { type: 'string' },
        name: { type: 'string' },
        tags: { type: 'array', items: { type: 'string' } },
        consumer: { type: 'string' },
        producer: { type: 'string' },
        ruleTypeId: { type: 'string' },
      },
      required: ['id', 'name', 'tags', 'consumer', 'producer', 'ruleTypeId'],
      additionalProperties: true,
    },
    alerts: {
      type: 'array',
      description:
        'Active alerts at trigger time. Shape follows `.internal.alerts-*` / AAD documents; `kibana.alert.*` varies by rule type.',
      items: {
        type: 'object',
        properties: {
          _id: { type: 'string' },
          _index: { type: 'string' },
          '@timestamp': { type: 'string' },
          kibana: {
            type: 'object',
            description: 'Canonical alert fields (rule-specific).',
            additionalProperties: true,
          },
        },
        required: ['_id'],
        additionalProperties: true,
      },
    },
    params: {
      type: 'object',
      description:
        'Rule-type params snapshot at trigger time (shape depends on `rule.ruleTypeId`).',
      additionalProperties: true,
    },
  },
  required: ['spaceId', 'rule', 'alerts'],
  additionalProperties: true,
};

/**
 * Central registry of reusable input shapes. Keys are the `<id>` segment only
 * (e.g. `alertingRuleV2EventContextV1` for `#/kibana/definitions/alertingRuleV2EventContextV1`).
 *
 * Domain plugins may register additional entries at startup (assign into this object).
 * Note: YAML editor `z.enum` completion for `$ref` only includes keys present at bundle time;
 * runtime-only keys still resolve at execution via {@link resolveRef} if added before validate.
 */
export const builtinWorkflowInputDefinitions: Record<string, JSONSchema7> = {
  alertingRuleV2EventContextV1,
};

const builtinRefList = Object.keys(builtinWorkflowInputDefinitions).map(
  (id) => `${KIBANA_WORKFLOW_INPUT_DEFINITION_REF_PREFIX}${id}`
);

/**
 * Literal values suggested for `$ref` under workflow `inputs` JSON Schema (Monaco YAML).
 * Kept in sync with {@link builtinWorkflowInputDefinitions} keys.
 */
export const builtinWorkflowInputDefinitionRefValuesForZod = builtinRefList as [
  string,
  ...string[]
];

/**
 * Merges {@link builtinWorkflowInputDefinitions} under `kibana.definitions` on the workflow
 * root JSON Schema document so `#/kibana/definitions/<id>` resolves for Monaco YAML and other
 * schema consumers that walk the document root.
 */
export function mergeKibanaBuiltinWorkflowInputDefinitionsIntoRootSchema<T extends object>(
  root: T | null
): T | null {
  if (!root || typeof root !== 'object') {
    return root;
  }
  if (builtinRefList.length === 0) {
    return root;
  }

  const existingKibana = (root as { kibana?: Record<string, unknown> }).kibana;
  const kibanaObject =
    existingKibana && typeof existingKibana === 'object' && !Array.isArray(existingKibana)
      ? existingKibana
      : {};

  const existingDefinitions = kibanaObject.definitions;
  const definitionsObject =
    existingDefinitions &&
    typeof existingDefinitions === 'object' &&
    !Array.isArray(existingDefinitions)
      ? (existingDefinitions as Record<string, JSONSchema7>)
      : {};

  return {
    ...root,
    kibana: {
      ...kibanaObject,
      definitions: {
        ...definitionsObject,
        ...builtinWorkflowInputDefinitions,
      },
    },
  };
}
