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
