/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { KQLSyntaxError } from '@kbn/es-query';
import { evaluateKql } from '@kbn/eval-kql';

export const evaluateCondition = (
  renderedCondition: string | boolean | undefined,
  context: Record<string, unknown>,
  stepId: string
): boolean => {
  if (typeof renderedCondition === 'boolean') {
    return renderedCondition;
  }
  if (typeof renderedCondition === 'undefined') {
    return false;
  }

  if (typeof renderedCondition === 'string') {
    // Liquid/template boolean expressions (e.g. `{{ a == b and c >= d }}`) render to the
    // literal strings "true"/"false", not valid KQL — evaluateKql would otherwise silently
    // misparse them (a bare `true` token isn't a KQL function/field expression and falls
    // through to `false`), causing every all-true composite condition to be treated as
    // unmet. Short-circuit on the exact rendered boolean before attempting KQL parsing.
    const trimmed = renderedCondition.trim();
    if (trimmed === 'true') {
      return true;
    }
    if (trimmed === 'false') {
      return false;
    }

    try {
      return evaluateKql(renderedCondition, context);
    } catch (error) {
      if (error instanceof KQLSyntaxError) {
        throw new Error(
          `Syntax error in condition "${renderedCondition}" for step ${stepId}: ${String(error)}`
        );
      }
      throw error;
    }
  }

  throw new Error(
    `Invalid condition type for step ${stepId}. ` +
      `Got ${JSON.stringify(renderedCondition)} (type: ${typeof renderedCondition}), ` +
      `but expected boolean or string (KQL expression).`
  );
};
