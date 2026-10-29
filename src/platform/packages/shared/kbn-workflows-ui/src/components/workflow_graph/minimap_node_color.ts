/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EuiThemeComputed } from '@elastic/eui';
import { transparentize } from '@elastic/eui';
import { TRIGGER_STEP_TYPES } from '@kbn/workflows';

// Minimap tint per loop-container (any CONTAINER_STEP_TYPES step: foreach,
// while, …) nesting depth, index 0 = outermost. Deeper containers fall back to
// solid primary; inner steps paint solid on top.
const MINIMAP_CONTAINER_ALPHAS = [0.2, 0.35] as const;

export type MinimapNodeColors = Pick<
  EuiThemeComputed['colors'],
  'danger' | 'success' | 'dangerText' | 'accent' | 'primary'
>;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

/**
 * Resolves the minimap dot colour for a graph node from its execution / lane / trigger state.
 * `containerDepth` is the nesting depth of a loop container (outermost = 1).
 */
export const getMinimapNodeColor = (
  node: { type?: string; data?: unknown },
  colors: MinimapNodeColors,
  containerDepth = 1
): string => {
  // Placeholder nodes for empty `if` branches are invisible — hide them in
  // the minimap too so they don't appear as spurious coloured dots.
  if (node.type === 'bypassLane') return 'transparent';
  // Loop containers are a translucent primary tint (regardless of execution
  // status) so the solid inner steps painted on top of them stay visible.
  if (node.type === 'foreachGroup') {
    const alpha = MINIMAP_CONTAINER_ALPHAS[containerDepth - 1];
    return alpha === undefined ? colors.primary : transparentize(colors.primary, alpha);
  }
  const data = isRecord(node.data) ? node.data : undefined;
  const stepExecution = isRecord(data?.stepExecution) ? data.stepExecution : undefined;
  const status = stepExecution?.status;
  if (status === 'failed') return colors.danger;
  if (status === 'completed') return colors.success;
  // Fallback-lane nodes that have not yet failed render in a lighter-danger
  // tint so they read as "the error path" without impersonating a failed step.
  // The `status === 'failed'` arm above takes priority, so a fallback step
  // that really failed still reads as full danger.
  if (data?.fallbackOf !== undefined) return colors.dangerText;
  // Figma (node 10808:19179): the trigger node reads as pink (accent) in the
  // minimap, matching its icon accent; all other steps are blue (primary).
  // Tokens keep the light look (#0b64dd / #ee72a6) and adapt in dark mode.
  const stepType = data?.stepType;
  const isTriggerNode =
    data?.isTrigger ||
    (typeof stepType === 'string' && stepType !== '' ? TRIGGER_STEP_TYPES.has(stepType) : false);
  return isTriggerNode ? colors.accent : colors.primary;
};
