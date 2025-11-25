/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiCodeBlockWrapper } from '../eui_components';
import type { ScoutPage } from '../fixtures/scope/test';
import type { SelectorInput } from '../utils';

export class CodeBlock {
  constructor(private readonly page: ScoutPage) {}

  /**
   * Get a code block wrapper instance for a specific code block.
   * @param selector - Selector to identify the code block (data-test-subj, locator, etc.)
   * @returns EuiCodeBlockWrapper instance
   */
  getCodeBlock(selector: SelectorInput): EuiCodeBlockWrapper {
    return new EuiCodeBlockWrapper(this.page, selector);
  }

  /**
   * Get the code value from a code block by its selector.
   * @param selector - Selector to identify the code block (data-test-subj, locator, etc.)
   * @returns The code value as plain text
   */
  async getCodeValue(selector: SelectorInput): Promise<string> {
    const codeBlock = this.getCodeBlock(selector);
    return await codeBlock.getCodeValue();
  }
}
