/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { WorkflowTokenUsage } from '@kbn/workflows';
import type { StepAiMetadata } from './normalize_step_ai';

export interface TokenRollupNode {
  /** Own AI metadata for this node (leaf AI steps). */
  ai?: StepAiMetadata;
  children?: TokenRollupNode[];
}

export interface TokenRollupResult {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  /** Count of nodes that contributed any token usage. */
  callCount: number;
  /** True when at least one descendant (or self) reported tokens. */
  hasTokens: boolean;
}

const emptyRollup = (): TokenRollupResult => ({
  inputTokens: 0,
  outputTokens: 0,
  totalTokens: 0,
  callCount: 0,
  hasTokens: false,
});

/**
 * Walk a step tree and aggregate token totals for a parent/root node.
 * Children without token data contribute 0 and are excluded from callCount.
 */
export const rollupTokenUsage = (node: TokenRollupNode): TokenRollupResult => {
  const children = node.children ?? [];
  if (children.length === 0) {
    const ai = node.ai;
    if (!ai) {
      return emptyRollup();
    }
    const inputTokens = ai.inputTokens ?? 0;
    const outputTokens = ai.outputTokens ?? 0;
    const totalTokens = ai.totalTokens ?? inputTokens + outputTokens;
    if (totalTokens <= 0) {
      return emptyRollup();
    }
    return {
      inputTokens,
      outputTokens,
      totalTokens,
      callCount: ai.callCount && ai.callCount > 0 ? ai.callCount : 1,
      hasTokens: true,
    };
  }

  return children.reduce<TokenRollupResult>((acc, child) => {
    const childRollup = rollupTokenUsage(child);
    if (!childRollup.hasTokens) {
      return acc;
    }
    return {
      inputTokens: acc.inputTokens + childRollup.inputTokens,
      outputTokens: acc.outputTokens + childRollup.outputTokens,
      totalTokens: acc.totalTokens + childRollup.totalTokens,
      callCount: acc.callCount + childRollup.callCount,
      hasTokens: true,
    };
  }, emptyRollup());
};

export const tokenRollupToUsage = (rollup: TokenRollupResult): WorkflowTokenUsage | undefined => {
  if (!rollup.hasTokens || rollup.totalTokens <= 0) {
    return undefined;
  }
  return {
    inputTokens: rollup.inputTokens,
    outputTokens: rollup.outputTokens,
    totalTokens: rollup.totalTokens,
  };
};

/**
 * Sum token usage across a flat list of step AI metadata (execution root).
 */
export const rollupStepAiList = (items: Array<StepAiMetadata | undefined>): TokenRollupResult =>
  rollupTokenUsage({
    children: items.filter((ai): ai is StepAiMetadata => ai != null).map((ai) => ({ ai })),
  });
