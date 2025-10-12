/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ISuggestionItem } from '../../../../../../commands_registry/types';
import type { ESQLColumn, ESQLSingleAstItem } from '../../../../../../types';
import type { ExpressionContext } from '../../types';
import { Builder } from '../../../../../../builder';
import type { OperatorDetector, PartialOperatorDetection } from './types';

/**
 * Base class for operator detectors.
 * Pattern convention: match[1] = field name, match[2] = operator name.
 */
export abstract class BaseOperatorDetector implements OperatorDetector {
  // Return the regex pattern to detect this operator
  protected abstract getPattern(): RegExp;

  // Build the synthetic AST node for the detected operator
  protected abstract buildSyntheticNode(fieldName: string, operatorName: string): ESQLSingleAstItem;

  // Provide operator-specific suggestions
  public abstract getSuggestions(
    detection: PartialOperatorDetection,
    context: ExpressionContext
  ): Promise<ISuggestionItem[] | null>;

  // Detect if this operator pattern exists in the text
  public detect(innerText: string): PartialOperatorDetection | null {
    const pattern = this.getPattern();
    const match = innerText.match(pattern);

    if (!match) {
      return null;
    }

    const fieldName = match[1];
    const operatorName = this.extractOperatorName(match);
    const syntheticNode = this.buildSyntheticNode(fieldName, operatorName);

    return {
      operatorName,
      syntheticNode,
      contextOverrides: {
        expressionRoot: syntheticNode,
      },
    };
  }

  // Extract operator name from regex match (defaults to group 2)
  protected extractOperatorName(match: RegExpMatchArray): string {
    return match[2] || '';
  }

  // Create a synthetic column AST node using Builder
  protected createColumnNode(fieldName: string): ESQLColumn {
    return Builder.expression.column(fieldName);
  }
}
