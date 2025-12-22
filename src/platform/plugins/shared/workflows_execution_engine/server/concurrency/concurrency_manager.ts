/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Logger } from '@kbn/core/server';
import type { ConcurrencySettings, WorkflowContext } from '@kbn/workflows';
import { WorkflowTemplatingEngine } from '../templating_engine';

/**
 * Manages concurrency control for workflow executions.
 *
 * Scope:
 * - Evaluating concurrency group keys from static strings or template expressions
 * - Enforcing concurrency limits per group
 * - Implementing collision strategies (queue, drop, cancel-in-progress)
 */
export class ConcurrencyManager {
  private readonly templatingEngine: WorkflowTemplatingEngine;
  private readonly logger: Logger;

  constructor(logger: Logger) {
    this.templatingEngine = new WorkflowTemplatingEngine();
    this.logger = logger;
  }

  /**
   * Evaluates a concurrency key from workflow settings and execution context.
   *
   * @param concurrencySettings - The concurrency settings from workflow definition
   * @param context - The workflow execution context for template evaluation
   * @returns The evaluated concurrency group key, or null if key is not set/empty.
   *          If template evaluation fails or returns null/undefined, returns the key as-is
   *          (treating it as a static string, as the user may have intended literal text).
   */
  public evaluateConcurrencyKey(
    concurrencySettings: ConcurrencySettings | undefined,
    context: WorkflowContext
  ): string | null {
    if (!concurrencySettings?.key) {
      return null;
    }

    const keyExpression = concurrencySettings.key.trim();
    if (keyExpression === '') {
      this.logger.debug('[Concurrency] Empty concurrency key provided');
      return null;
    }
    if (!keyExpression.includes('{{') || !keyExpression.includes('}}')) {
      return keyExpression;
    }

    try {
      const evaluated = this.templatingEngine.evaluateExpression(
        keyExpression,
        context as Record<string, unknown>
      );

      if (evaluated === null || evaluated === undefined) {
        this.logger.debug(
          `[Concurrency] Concurrency key evaluation returned null/undefined for expression: ${keyExpression}. Treating as static string.`
        );
        return keyExpression;
      }

      const result = String(evaluated).trim();

      if (result === '') {
        this.logger.debug(
          `[Concurrency] Concurrency key evaluation returned empty string for expression: ${keyExpression}`
        );
        return null;
      }

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.debug(
        `[Concurrency] Failed to evaluate concurrency key expression "${keyExpression}": ${errorMessage}. Treating as static string.`
      );
      return keyExpression;
    }
  }
}
