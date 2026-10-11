/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Session, WebDriver, WebElement } from 'selenium-webdriver';
import { ToolingLog } from '@kbn/tooling-log';
import {
  RetryService,
  type FtrProviderContext as CommonFtrProviderContext,
} from '@kbn/ftr-common-functional-services';
import { WebElementWrapper } from './web_element_wrapper';
import { Browsers } from './remote/browsers';
import type { FtrProviderContext } from './ftr_provider_context';
import { TestSubjects } from './test_subjects';

describe('TestSubjects existence checks', () => {
  const existsByCssSelector = jest.fn();
  const existsByDisplayedByCssSelector = jest.fn();
  const firstDisplayedIndexByCssSelector = jest.fn();

  const getTestSubjects = () => {
    const config = {
      get: jest.fn((key: string) => {
        switch (key) {
          case 'timeouts.find':
            return 10000;
          case 'timeouts.try':
            return 120000;
          case 'timeouts.waitForExists':
            return 2500;
          default:
            throw new Error(`Unexpected config key: ${key}`);
        }
      }),
    };
    const services = {
      config,
      find: {
        existsByCssSelector,
        existsByDisplayedByCssSelector,
        firstDisplayedIndexByCssSelector,
      },
      log: { debug: jest.fn(), warning: jest.fn() },
      retry: {},
    };
    const ctx = {
      getService: (name: keyof typeof services) => services[name],
    } as unknown as FtrProviderContext & CommonFtrProviderContext;

    services.retry = new RetryService(ctx);
    return new TestSubjects(ctx);
  };

  beforeEach(() => {
    existsByCssSelector.mockReset().mockResolvedValue(true);
    existsByDisplayedByCssSelector.mockReset().mockResolvedValue(true);
    firstDisplayedIndexByCssSelector.mockReset().mockResolvedValue(-1);
  });

  describe('enabled controls', () => {
    const createElement = () => {
      const driver = new WebDriver(Promise.resolve(new Session('ftr', {})), {
        execute: jest.fn(),
      });
      return new WebElementWrapper(
        new WebElement(driver, 'button'),
        null,
        driver,
        10000,
        0,
        new ToolingLog(),
        Browsers.Chrome
      );
    };

    beforeEach(() => jest.useFakeTimers());
    afterEach(() => jest.useRealTimers());

    it('waits through disabled and hidden states and re-resolves the element', async () => {
      const testSubjects = getTestSubjects();
      const element = createElement();
      jest.spyOn(element, 'isDisplayed').mockResolvedValueOnce(false).mockResolvedValue(true);
      jest.spyOn(element, 'isEnabled').mockResolvedValueOnce(false).mockResolvedValue(true);
      const find = jest.spyOn(testSubjects, 'find').mockResolvedValue(element);
      const result = testSubjects.waitForEnabled('button', 5000);

      await jest.runAllTimersAsync();

      await expect(result).resolves.toBe(true);
      expect(find).toHaveBeenCalledTimes(3);
    });

    it('rejects when a control stays disabled within the configured budget', async () => {
      const testSubjects = getTestSubjects();
      const element = createElement();
      jest.spyOn(element, 'isDisplayed').mockResolvedValue(true);
      jest.spyOn(element, 'isEnabled').mockResolvedValue(false);
      jest.spyOn(testSubjects, 'find').mockResolvedValue(element);
      const result = expect(testSubjects.waitForEnabled('button', 50)).rejects.toThrow(
        'timed out waiting for button to be visible and enabled'
      );

      await jest.runAllTimersAsync();
      await result;
    });
  });

  it('performs an immediate displayed check with exists', async () => {
    const testSubjects = getTestSubjects();

    const exists = await testSubjects.exists('selector');

    expect(exists).toBe(true);
    expect(existsByDisplayedByCssSelector).toHaveBeenCalledWith('[data-test-subj="selector"]', 0);
  });

  it('performs an immediate hidden-allowed check with exists', async () => {
    const testSubjects = getTestSubjects();

    const exists = await testSubjects.exists('selector', { allowHidden: true });

    expect(exists).toBe(true);
    expect(existsByCssSelector).toHaveBeenCalledWith('[data-test-subj="selector"]', 0);
  });

  it('uses the configured default timeout with waitForExists', async () => {
    const testSubjects = getTestSubjects();

    await expect(testSubjects.waitForExists('selector')).resolves.toBe(true);

    expect(existsByDisplayedByCssSelector).toHaveBeenCalledWith(
      '[data-test-subj="selector"]',
      2500
    );
  });

  it('passes an explicit timeout through waitForExists', async () => {
    const testSubjects = getTestSubjects();

    await expect(testSubjects.waitForExists('selector', { timeout: 5000 })).resolves.toBe(true);

    expect(existsByDisplayedByCssSelector).toHaveBeenCalledWith(
      '[data-test-subj="selector"]',
      5000
    );
  });

  it('returns false when waitForExists times out', async () => {
    existsByDisplayedByCssSelector.mockResolvedValue(false);
    const testSubjects = getTestSubjects();

    await expect(testSubjects.waitForExists('selector')).resolves.toBe(false);
    expect(existsByDisplayedByCssSelector).toHaveBeenCalledWith(
      '[data-test-subj="selector"]',
      2500
    );
  });

  it('uses the try timeout and throws when existOrFail does not find the element', async () => {
    existsByDisplayedByCssSelector.mockResolvedValue(false);
    const testSubjects = getTestSubjects();

    await expect(testSubjects.existOrFail('selector')).rejects.toThrow(
      'expected testSubject(selector) to exist'
    );
    expect(existsByDisplayedByCssSelector).toHaveBeenCalledWith(
      '[data-test-subj="selector"]',
      120000
    );
  });

  it('returns the first displayed test subject with waitForFirst', async () => {
    firstDisplayedIndexByCssSelector.mockResolvedValue(1);
    const testSubjects = getTestSubjects();

    await expect(testSubjects.waitForFirst(['legacy', 'next'])).resolves.toBe('next');
    expect(firstDisplayedIndexByCssSelector).toHaveBeenCalledWith(
      ['[data-test-subj="legacy"]', '[data-test-subj="next"]'],
      2500
    );
  });

  it('returns undefined when no test subject appears with waitForFirst', async () => {
    const testSubjects = getTestSubjects();

    await expect(testSubjects.waitForFirst(['legacy', 'next'], { timeout: 50 })).resolves.toBe(
      undefined
    );
    expect(firstDisplayedIndexByCssSelector).toHaveBeenCalledWith(
      ['[data-test-subj="legacy"]', '[data-test-subj="next"]'],
      50
    );
  });
});
