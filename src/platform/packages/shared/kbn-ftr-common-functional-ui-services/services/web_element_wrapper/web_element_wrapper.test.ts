/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { WebDriver, WebElement } from 'selenium-webdriver';
import type { ToolingLog } from '@kbn/tooling-log';
import { Browsers } from '../remote/browsers';
import { WebElementWrapper } from './web_element_wrapper';

describe('WebElementWrapper custom find timeout', () => {
  let findElements: jest.Mock;
  let setTimeouts: jest.Mock;

  const getWrapper = () =>
    new WebElementWrapper(
      { findElements } as unknown as WebElement,
      null,
      { manage: () => ({ setTimeouts }) } as unknown as WebDriver,
      10000,
      0,
      { debug: jest.fn(), warning: jest.fn() } as unknown as ToolingLog,
      Browsers.Chrome
    );

  beforeEach(() => {
    findElements = jest.fn().mockResolvedValue([]);
    setTimeouts = jest.fn().mockResolvedValue(undefined);
  });

  it('honors and restores a zero timeout', async () => {
    await expect(getWrapper().findAllByCssSelector('.selector', 0)).resolves.toEqual([]);

    expect(setTimeouts.mock.calls).toEqual([[{ implicit: 0 }], [{ implicit: 10000 }]]);
  });

  it('restores the default timeout when the lookup fails', async () => {
    findElements.mockRejectedValue(new Error('lookup failed'));

    await expect(getWrapper().findAllByCssSelector('.selector', 0)).rejects.toThrow(
      'lookup failed'
    );

    expect(setTimeouts.mock.calls).toEqual([[{ implicit: 0 }], [{ implicit: 10000 }]]);
  });
});
