/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Locator } from '@playwright/test';
import type { ScoutPage } from '../fixtures/scope/test/scout_page';
import { resolveSelector, type SelectorInput } from '../utils';

// https://eui.elastic.co/next/docs/display/code/
export class EuiCodeBlockWrapper {
  private readonly codeBlockWrapper: Locator;
  private readonly codeElement: Locator;
  private readonly copyButton: Locator;

  /**
   * Create a new EuiCodeBlockWrapper instance.
   * new EuiCodeBlockWrapper(page, { dataTestSubj: 'myCodeBlock' })
   * new EuiCodeBlockWrapper(page, 'myCodeBlock') // backward compatibility
   * new EuiCodeBlockWrapper(page, { locator: '.euiCodeBlock' })
   */
  constructor(page: ScoutPage, selector: SelectorInput) {
    this.codeBlockWrapper = resolveSelector(page, selector);
    this.codeElement = this.codeBlockWrapper.locator('code.euiCodeBlock__code');
    this.copyButton = this.codeBlockWrapper.getByTestId('euiCodeBlockCopy');
  }

  getWrapper(): Locator {
    return this.codeBlockWrapper;
  }

  getCodeElement(): Locator {
    return this.codeElement;
  }

  getCopyButton(): Locator {
    return this.copyButton;
  }

  /**
   * Get the code value from the code block.
   */
  async getCodeValue(): Promise<string> {
    const codeText = await this.codeElement.textContent();
    return codeText?.trim() || '';
  }
}
