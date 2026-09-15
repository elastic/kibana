/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getBuiltInStepDefinition, StepCategory, TRIGGER_STEP_TYPES } from '@kbn/workflows';

/**
 * Visual family that drives chip colours on the graph canvas.
 * Maps to the six rows in the token table (visual-builder-canvas-eui-tokens.md).
 */
export type StepFamily = 'trigger' | 'flow' | 'data' | 'code' | 'external' | 'brand';

// These three built-in step types belong to the `code` family per the token
// doc — `console` is categorised as `Kibana` in StepCategory, which disagrees,
// so we handle it explicitly before the registry lookup.
const CODE_TYPES = new Set(['console', 'http', 'inference']);

/**
 * Determines the visual chip family for a step type, used solely for idle
 * colour assignment on the canvas.
 *
 * Priority:
 *  1. trigger — isTrigger flag or a known trigger step type
 *  2. code — console / http / inference / ai.* (doc override for console)
 *  3. data — data.* prefix
 *  4. brand — elasticsearch* / kibana* prefixes (product logos)
 *  5. flow — derived from the builtin registry (all flow-control steps are builtins)
 *  6. external — everything else (third-party connectors, unknown step types)
 *
 * `getBuiltInStepDefinition` is a pure Map.get over a static array, so this
 * function is synchronous and needs no plugin services — safe in the
 * screenshot CLI and package-only contexts.
 */
export const getStepFamily = (stepType: string, isTrigger: boolean): StepFamily => {
  const type = stepType.startsWith('.') ? stepType.slice(1) : stepType;

  if (isTrigger || TRIGGER_STEP_TYPES.has(type) || type.startsWith('trigger_')) return 'trigger';
  if (CODE_TYPES.has(type) || type.startsWith('ai.')) return 'code';
  if (type.startsWith('data.')) return 'data';
  if (type.startsWith('elasticsearch') || type.startsWith('kibana')) return 'brand';
  if (getBuiltInStepDefinition(type)?.category === StepCategory.FlowControl) return 'flow';
  return 'external';
};
