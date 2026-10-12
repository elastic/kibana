/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Session, WebDriver, WebElement } from 'selenium-webdriver';
import type { Command } from 'selenium-webdriver/lib/command';
import { ToolingLog } from '@kbn/tooling-log';
import { FindService } from './find';

describe('FindService deletion waits', () => {
  const execute = jest.fn(async (_command: Command): Promise<WebElement[]> => []);
  const driver = new WebDriver(Promise.resolve(new Session('ftr', {})), { execute });
  const waitForDeletion = (timeout = 100) =>
    FindService.prototype.waitForDeletedByCssSelector.call(
      {
        log: new ToolingLog(),
        driver,
        defaultFindTimeout: 10000,
        _withTimeout: async (implicit: number) => driver.manage().setTimeouts({ implicit }),
      },
      '.removed',
      timeout
    );
  const timeoutCalls = () =>
    execute.mock.calls
      .filter(([command]) => command.getName() === 'setTimeout')
      .map(([command]) => command.getParameters().implicit);

  beforeEach(() => execute.mockReset().mockResolvedValue([]));

  it('checks for deletion without an implicit appearance wait and restores the default', async () => {
    await waitForDeletion();
    expect(timeoutCalls()).toEqual([0, 10000]);
  });

  it('retains the explicit deadline while an element remains present', async () => {
    execute.mockImplementation(async (command) => {
      return command.getName() === 'findElements' ? [new WebElement(driver, 'present')] : [];
    });
    await expect(waitForDeletion(1)).rejects.toThrow('still present');
    expect(timeoutCalls()).toEqual([0, 10000]);
  });

  it('restores the default timeout after a lookup error', async () => {
    execute.mockImplementation(async (command) => {
      if (command.getName() === 'findElements') throw new Error('lookup failed');
      return [];
    });
    await expect(waitForDeletion()).rejects.toThrow('lookup failed');
    expect(timeoutCalls()).toEqual([0, 10000]);
  });
});
