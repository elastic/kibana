/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { error, Session, WebDriver, WebElement } from 'selenium-webdriver';
import type { Command } from 'selenium-webdriver/lib/command';
import { ToolingLog } from '@kbn/tooling-log';
import { RetryService } from '@kbn/ftr-common-functional-services';
import { WebElementWrapper } from './web_element_wrapper';
import { FindService } from './find';
import { Browsers } from './remote/browsers';
import { ToastsService } from './toasts';

describe('ToastsService empty snapshots', () => {
  it('keeps a bounded root lookup when requesting a zero-timeout child snapshot', async () => {
    let rootReads = 0;
    const execute = jest.fn(async (_command: Command) => {
      if (rootReads++ > 0) throw new Error('Root lookup has no deadline');
      await new Promise((resolve) => setTimeout(resolve, 5));
      return [];
    });
    const driver = new WebDriver(Promise.resolve(new Session('ftr', {})), { execute });
    const find = {
      driver,
      log: new ToolingLog(),
      defaultFindTimeout: 1,
      fixedHeaderHeight: 0,
      browserType: Browsers.Chrome,
      findAndWrap: FindService.prototype['findAndWrap'],
      wrap: FindService.prototype['wrap'],
    };
    const toasts = {
      getGlobalList: ToastsService.prototype['getGlobalList'],
      testSubjects: {
        find: (selector: string, timeout?: number) =>
          FindService.prototype.byCssSelector.call(find, `[data-test-subj="${selector}"]`, timeout),
      },
    };
    await expect(
      ToastsService.prototype.getAll.call(toasts, { timeout: 0 })
    ).rejects.toBeInstanceOf(error.TimeoutError);
    expect(rootReads).toBe(1);
  });
});

describe('ToastsService title and dismissal readiness', () => {
  const createElement = (id: string) => {
    const driver = new WebDriver(Promise.resolve(new Session('ftr', {})), {
      execute: jest.fn(),
    });
    return new WebElementWrapper(
      new WebElement(driver, id),
      null,
      driver,
      10000,
      0,
      new ToolingLog(),
      Browsers.Chrome
    );
  };
  const createToasts = () => {
    const toast = createElement('toast');
    const title = createElement('title');
    const closeButton = createElement('close');
    jest.spyOn(toast, 'moveMouseTo').mockResolvedValue(undefined);
    jest.spyOn(toast, 'findByTestSubject').mockImplementation(async (selector) => {
      if (selector === 'euiToastHeader__title') return title;
      if (selector === 'toastCloseButton') return closeButton;
      throw new Error(`Unexpected toast control ${selector}`);
    });
    const readTitle = jest.spyOn(title, 'getVisibleText').mockResolvedValue('Saved visualization');
    const click = jest.spyOn(closeButton, 'click').mockResolvedValue(undefined);
    const find = {
      byCssSelector: jest.fn().mockResolvedValue(toast),
      waitForElementStale: jest.fn().mockResolvedValue(undefined),
    };
    const testSubjects = {
      find: jest.fn().mockResolvedValue(toast),
      click: jest.fn(),
    };
    const service = {
      find,
      testSubjects,
      defaultFindTimeout: 1000,
      retry: {
        log: new ToolingLog(),
        ctx: { getService: () => undefined },
        tryForTime: RetryService.prototype.tryForTime,
      },
    };
    return { service, toast, readTitle, click, find, testSubjects };
  };

  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('waits for visible text before dismissing and awaits removal of the same toast', async () => {
    const { service, toast, readTitle, click, find, testSubjects } = createToasts();
    readTitle.mockResolvedValueOnce('');
    const result = ToastsService.prototype.getTitleAndDismiss.call(service);
    await jest.runAllTimersAsync();

    await expect(result).resolves.toBe('Saved visualization');
    expect(readTitle).toHaveBeenCalledTimes(2);
    expect(find.byCssSelector).toHaveBeenCalledTimes(2);
    expect(click).toHaveBeenCalledTimes(1);
    expect(find.waitForElementStale).toHaveBeenCalledWith(toast, 1000);
    expect(testSubjects.find).not.toHaveBeenCalled();
    expect(testSubjects.click).not.toHaveBeenCalled();
  });

  it('targets the requested toast instead of reading or dismissing an unrelated notification', async () => {
    const { service, toast, click, find, testSubjects } = createToasts();
    await expect(
      ToastsService.prototype.getTitleAndDismiss.call(service, 'saveVisualizationSuccess')
    ).resolves.toBe('Saved visualization');
    expect(testSubjects.find).toHaveBeenCalledWith('saveVisualizationSuccess', 1000);
    expect(find.byCssSelector).not.toHaveBeenCalled();
    expect(toast.findByTestSubject).toHaveBeenCalledWith('euiToastHeader__title');
    expect(toast.findByTestSubject).toHaveBeenCalledWith('toastCloseButton');
    expect(click).toHaveBeenCalledTimes(1);
    expect(testSubjects.click).not.toHaveBeenCalled();
  });
});
