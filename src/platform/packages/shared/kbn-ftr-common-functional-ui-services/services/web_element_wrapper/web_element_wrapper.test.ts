/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { By, error, Session, WebDriver, WebElement } from 'selenium-webdriver';
import type { Command } from 'selenium-webdriver/lib/command';
import { ToolingLog } from '@kbn/tooling-log';
import { Browsers } from '../remote/browsers';
import { WebElementWrapper } from './web_element_wrapper';

describe('WebElementWrapper child lookup timeouts', () => {
  const execute = jest.fn(async (_command: Command) => []);
  const createWrapper = () => {
    const driver = new WebDriver(Promise.resolve(new Session('ftr', {})), { execute });
    return new WebElementWrapper(
      new WebElement(driver, 'parent'),
      null,
      driver,
      10000,
      0,
      new ToolingLog(),
      Browsers.Chrome
    );
  };
  const timeoutCalls = () =>
    execute.mock.calls
      .filter(([command]) => command.getName() === 'setTimeout')
      .map(([command]) => command.getParameters().implicit);

  beforeEach(() => execute.mockReset().mockResolvedValue([]));

  it('honors zero timeout for an empty child lookup and restores the default', async () => {
    await expect(createWrapper().findAllByCssSelector('.missing', 0)).resolves.toEqual([]);
    expect(timeoutCalls()).toEqual([0, 10000]);
  });

  it('restores the default timeout when a child lookup fails', async () => {
    execute.mockImplementation(async (command) => {
      if (command.getName() === 'findChildElements') throw new Error('lookup failed');
      return [];
    });
    await expect(createWrapper().findAllByClassName('missing', 50)).rejects.toThrow(
      'lookup failed'
    );
    expect(timeoutCalls()).toEqual([50, 10000]);
  });

  it('keeps the default timeout when no override is supplied', async () => {
    await createWrapper().findAllByCssSelector('.missing');
    expect(timeoutCalls()).toEqual([]);
  });
});

describe('WebElementWrapper class checks', () => {
  it('re-finds a stale root element before reading its classes', async () => {
    let classReads = 0;
    const execute = jest.fn(
      async (
        command: Command
      ): Promise<string | { 'element-6066-11e4-a52e-4f735466cecf': string }> => {
        if (command.getName() === 'findElement') {
          return { 'element-6066-11e4-a52e-4f735466cecf': 'fresh-parent' };
        }
        if (classReads++ === 0) throw new error.StaleElementReferenceError('parent replaced');
        return 'euiComboBox__inputWrap';
      }
    );
    const driver = new WebDriver(Promise.resolve(new Session('ftr', {})), { execute });
    const wrapper = new WebElementWrapper(
      new WebElement(driver, 'stale-parent'),
      By.css('.field'),
      driver,
      10000,
      0,
      new ToolingLog(),
      Browsers.Chrome
    );
    await expect(wrapper.elementHasClass('euiComboBox__inputWrap')).resolves.toBe(true);
    expect(classReads).toBe(2);
    expect(
      execute.mock.calls
        .filter(([command]) => command.getName() === 'findElement')
        .map(([command]) => command.getParameters().value)
    ).toEqual(['.field']);
  });
});
