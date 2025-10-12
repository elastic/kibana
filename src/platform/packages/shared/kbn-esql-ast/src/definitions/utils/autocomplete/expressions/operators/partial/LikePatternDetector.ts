/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { BaseListOperatorDetector } from './BaseListOperatorDetector';

// LIKE/RLIKE operator pattern (including NOT variants)
const LIKE_OPERATOR_PATTERN = /\b(?:not\s+)?r?like\b/i;

// Detects LIKE/RLIKE pattern matching operators (including NOT variants)
// Handles both single patterns and lists: "field LIKE pattern" or "field LIKE (pattern1, pattern2)"
export class LikePatternDetector extends BaseListOperatorDetector {
  protected getOperatorPattern(): RegExp {
    return LIKE_OPERATOR_PATTERN;
  }

  protected getOperatorName(text: string): string {
    const low = text.toLowerCase();

    if (low.includes('not rlike')) {
      return 'rlike';
    }

    if (low.includes('not like')) {
      return 'like';
    }

    if (low.includes('rlike')) {
      return 'rlike';
    }

    return 'like';
  }
}
