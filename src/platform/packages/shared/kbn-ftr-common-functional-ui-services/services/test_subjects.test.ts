/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { RetryService } from '@kbn/ftr-common-functional-services';
import type { FtrProviderContext as CommonFtrProviderContext } from '@kbn/ftr-common-functional-services';
import type { FtrProviderContext } from './ftr_provider_context';
import { TestSubjects } from './test_subjects';

describe('TestSubjects existence checks', () => {
  const existsByCssSelector = jest.fn();
  const existsByDisplayedByCssSelector = jest.fn();
  const firstDisplayedIndexByCssSelector = jest.fn();
  const findByCssSelector = jest.fn();

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
        byCssSelector: findByCssSelector,
      },
      log: { debug: jest.fn() },
    };
    const retryContext: Pick<CommonFtrProviderContext, 'getService'> = {
      getService: jest.fn().mockImplementation((name: keyof typeof services) => services[name]),
    };
    const retry = new RetryService(retryContext as CommonFtrProviderContext);
    const ctx = {
      getService: (name: keyof typeof services | 'retry') =>
        name === 'retry' ? retry : services[name],
    } as unknown as FtrProviderContext;

    return new TestSubjects(ctx);
  };

  beforeEach(() => {
    existsByCssSelector.mockReset().mockResolvedValue(true);
    existsByDisplayedByCssSelector.mockReset().mockResolvedValue(true);
    firstDisplayedIndexByCssSelector.mockReset().mockResolvedValue(-1);
    findByCssSelector.mockReset();
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

  describe('waitForEnabled', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('retries while the element is disabled', async () => {
      const isEnabled = jest.fn().mockResolvedValueOnce(false).mockResolvedValue(true);
      findByCssSelector.mockResolvedValue({
        isDisplayed: jest.fn().mockResolvedValue(true),
        isEnabled,
      });
      const result = expect(getTestSubjects().waitForEnabled('selector')).resolves.toBe(true);

      await jest.advanceTimersByTimeAsync(100);

      await result;
      expect(isEnabled).toHaveBeenCalledTimes(2);
    });

    it('retries while the element is hidden', async () => {
      const isDisplayed = jest.fn().mockResolvedValueOnce(false).mockResolvedValue(true);
      findByCssSelector.mockResolvedValue({
        isDisplayed,
        isEnabled: jest.fn().mockResolvedValue(true),
      });
      const result = expect(getTestSubjects().waitForEnabled('selector')).resolves.toBe(true);

      await jest.advanceTimersByTimeAsync(100);

      await result;
      expect(isDisplayed).toHaveBeenCalledTimes(2);
    });

    it('throws when the element stays disabled until the timeout', async () => {
      findByCssSelector.mockResolvedValue({
        isDisplayed: jest.fn().mockResolvedValue(true),
        isEnabled: jest.fn().mockResolvedValue(false),
      });
      const result = expect(getTestSubjects().waitForEnabled('selector', 250)).rejects.toThrow(
        'expected testSubject(selector) to be displayed and enabled'
      );

      await jest.advanceTimersByTimeAsync(300);

      await result;
    });
  });
});
