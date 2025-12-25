/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { fireEvent } from '@testing-library/react';

type Root = Document | HTMLElement;

/**
 * Harness for EUI pagination (EuiPagination / EuiTablePagination).
 *
 * Encapsulates the DOM details of locating pagination buttons.
 */
export class EuiPaginationTestHarness {
  #root: Root;

  constructor(root: Root = document) {
    this.#root = root;
  }

  public get buttons(): HTMLButtonElement[] {
    return Array.from(this.#root.querySelectorAll<HTMLButtonElement>('button.euiPaginationButton'));
  }

  public getButtonByLabel(label: string): HTMLButtonElement {
    const button = this.buttons.find((b) => (b.textContent || '').trim() === label);
    if (!button) {
      throw new Error(`Expected pagination button "${label}" to exist`);
    }
    return button;
  }

  public clickButton(label: string) {
    fireEvent.click(this.getButtonByLabel(label));
  }
}
