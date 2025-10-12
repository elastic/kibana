/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { BaseListOperatorDetector } from './BaseListOperatorDetector';
import type { PartialOperatorDetection } from './types';

// IN/NOT IN operator pattern
const IN_OPERATOR_PATTERN = /\b(?:not\s+)?in\b/i;

// Detects IN/NOT IN operators with list syntax
export class ListDetector extends BaseListOperatorDetector {
  protected getOperatorPattern(): RegExp {
    return IN_OPERATOR_PATTERN;
  }

  protected getOperatorName(text: string): string {
    const low = text.toLowerCase();

    return low.includes('not in') ? 'not in' : 'in';
  }

  // Override detect to pass isInsideInList flag for backwards compatibility
  public detect(innerText: string): PartialOperatorDetection | null {
    const detection = super.detect(innerText);

    if (!detection) {
      return null;
    }

    // Set isInsideInList flag when we have a list opened
    const trimmed = innerText.trimEnd();
    const isInList = this.endsWithListStart(trimmed);

    return {
      ...detection,
      optionsOverrides: {
        isInsideInList: isInList,
      },
    };
  }
}
