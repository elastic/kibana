/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { fireEvent, screen, within } from '@testing-library/react';

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

  #queries() {
    return this.#root instanceof HTMLElement ? within(this.#root) : screen;
  }

  public get buttons(): HTMLButtonElement[] {
    return this.#queries().queryAllByTestId(/^pagination-button-/) as HTMLButtonElement[];
  }

  public getButtonByLabel(label: string): HTMLButtonElement {
    const queries = this.#queries();

    // EUI uses `data-test-subj="pagination-button-${pageIndex}"` (0-based) for numeric buttons.
    // It also uses `data-test-subj="pagination-button-${type}"` for arrow buttons (first/previous/next/last).
    const pageNumber = Number(label);
    const testId = Number.isFinite(pageNumber)
      ? `pagination-button-${pageNumber - 1}`
      : `pagination-button-${label}`;

    const el = queries.queryByTestId(testId);
    if (!el) {
      throw new Error(`Expected pagination button "${label}" (${testId}) to exist`);
    }
    return el as HTMLButtonElement;
  }

  public clickButton(label: string) {
    fireEvent.click(this.getButtonByLabel(label));
  }
}
