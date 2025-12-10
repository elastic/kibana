/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { screen, fireEvent } from '@testing-library/react';

export class EuiSwitchTestHarness {
  #testId: string;

  /**
   * Returns switch element or throws
   */
  get #switchEl() {
    return screen.getByTestId(this.#testId);
  }

  constructor(testId: string) {
    this.#testId = testId;
  }

  /**
   * Returns `data-test-subj` of switch
   */
  public get testId() {
    return this.#testId;
  }

  /**
   * Returns switch if found, otherwise `null`
   */
  public get self() {
    return screen.queryByTestId(this.#testId);
  }

  /**
   * Toggle the switch
   */
  public toggle() {
    fireEvent.click(this.#switchEl);
  }
}
