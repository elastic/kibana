/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ISuggestionItem } from '../../../../../../commands_registry/types';
import type { ExpressionContext } from '../../types';
import type { OperatorDetector, PartialOperatorDetection } from './types';
import { endsWithIsOrIsNotToken } from '../utils';
import { getFunctionDefinition } from '../../../../functions';

const TRAILING_NON_WORD_REGEX = /\W+$/;
const WHITESPACE_NORMALIZE_REGEX = /\s+/g;
const TRAILING_WHITESPACE_REGEX = /\s+$/;

const NULL_CHECK_CANDIDATES = ['is null', 'is not null'] as const;

/**
 * Detects partial IS NULL / IS NOT NULL operators.
 * Unlike other detectors, this generates suggestions directly without creating synthetic nodes.
 * Examples: "field IS ", "field IS NOT ", "field IS /"
 */
export class NullCheckDetector implements OperatorDetector {
  public detect(innerText: string): PartialOperatorDetection | null {
    // Clean trailing non-word chars (e.g., "/" test markers) before detection
    const cleanedText = innerText.replace(TRAILING_NON_WORD_REGEX, ' ');

    if (!endsWithIsOrIsNotToken(cleanedText)) {
      return null;
    }

    // Store only what we need - textBeforeCursor for prefix matching
    // operatorName is required by interface but not used (we generate suggestions directly)
    return {
      operatorName: '',
      textBeforeCursor: innerText,
    };
  }

  public async getSuggestions(
    detection: PartialOperatorDetection,
    context: ExpressionContext
  ): Promise<ISuggestionItem[] | null> {
    // Normalize query for prefix matching: "is " → "is ", "is  not  " → "is not "
    const textBeforeCursor = detection.textBeforeCursor || context.innerText;
    const queryNormalized = textBeforeCursor
      .toLowerCase()
      .replace(WHITESPACE_NORMALIZE_REGEX, ' ')
      .replace(TRAILING_WHITESPACE_REGEX, ' ');

    const suggestions: ISuggestionItem[] = [];

    // Filter candidates by prefix matching: "is " → IS NULL, "is not " → IS NOT NULL
    for (const name of NULL_CHECK_CANDIDATES) {
      const def = getFunctionDefinition(name);

      if (!def) {
        continue;
      }

      // Check if query ends with any prefix of candidate (e.g., "is n" matches "is not null")
      const candidateLower = name.toLowerCase();
      const matches = [...candidateLower].some((_, i) =>
        queryNormalized.endsWith(candidateLower.slice(0, i + 1))
      );

      if (matches) {
        const label = name.toUpperCase();

        suggestions.push({
          label,
          text: label,
          kind: 'Operator',
          detail: def.description,
          sortText: 'D',
        });
      }
    }

    return suggestions.length > 0 ? suggestions : null;
  }
}
