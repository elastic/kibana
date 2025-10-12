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
import type { OperatorDetector } from './types';

/**
 * Registry for partial operator detectors.
 * Iterates through detectors in registration order until one provides suggestions.
 */
export class OperatorDetectorRegistry {
  private detectors: OperatorDetector[] = [];

  // Register a new detector
  register(detector: OperatorDetector): void {
    this.detectors.push(detector);
  }

  // Try each detector until one provides suggestions
  async detectAndSuggest(
    innerText: string,
    context: ExpressionContext
  ): Promise<ISuggestionItem[] | null> {
    for (const detector of this.detectors) {
      const detection = detector.detect(innerText);

      if (detection) {
        const suggestions = await detector.getSuggestions(detection, context);

        if (suggestions !== null) {
          return suggestions;
        }
      }
    }

    return null;
  }
}
