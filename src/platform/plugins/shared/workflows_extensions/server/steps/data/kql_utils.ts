/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { KueryNode } from '@kbn/es-query';
import { KQLSyntaxError } from '@kbn/es-query';
import { decodeKqlTemplateValues, parseKqlTemplate } from '@kbn/eval-kql';
import type { ContextManager } from '../../step_registry/types';

export function isKqlSyntaxError(error: unknown): error is KQLSyntaxError {
  return error instanceof KQLSyntaxError;
}

/**
 * Renders the raw `condition` input so that interpolated values stay literals. Throws instead of
 * falling back to the generically rendered input, which would let them be parsed as KQL.
 */
export function renderKqlCondition(
  contextManager: ContextManager,
  rawCondition: string | undefined
): string {
  if (!rawCondition) {
    return '';
  }
  if (!contextManager.renderKqlConditionTemplate) {
    throw new Error('The workflow engine cannot safely render KQL conditions');
  }
  return contextManager.renderKqlConditionTemplate(rawCondition);
}

/**
 * Parses a condition rendered by `renderKqlCondition` once, before looping over the items. Syntax
 * errors are reported with the interpolated values decoded.
 */
export function parseKqlCondition(renderedCondition: string): KueryNode {
  try {
    return parseKqlTemplate(renderedCondition);
  } catch (error) {
    if (isKqlSyntaxError(error)) {
      throw new Error(`Invalid KQL condition: ${decodeKqlTemplateValues(error.message)}`);
    }
    throw error;
  }
}
