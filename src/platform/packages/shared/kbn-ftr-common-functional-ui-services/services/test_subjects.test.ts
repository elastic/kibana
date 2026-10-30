/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { RetryService } from '@kbn/ftr-common-functional-services';
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
      log: { debug: jest.fn() },
      retry: {},
    };
    const ctx = {
      getService: (name: keyof typeof services) => services[name],
    } as unknown as FtrProviderContext;

    return new TestSubjects(ctx);
  };

  beforeEach(() => {
    existsByCssSelector.mockReset().mockResolvedValue(true);
    existsByDisplayedByCssSelector.mockReset().mockResolvedValue(true);
    firstDisplayedIndexByCssSelector.mockReset().mockResolvedValue(-1);
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

describe('TestSubjects.waitForEnabled', () => {
  const byCssSelector = jest.fn();
  const isDisplayed = jest.fn();
  const isEnabled = jest.fn();

  // Uses the real RetryService so the tests exercise the production poll/timeout semantics
  // (retryForTruthy: a falsy result is retried every 100 ms, only the deadline throws). Timers
  // are faked so probe counts and the deadline are deterministic rather than wall-clock based.
  const getTestSubjects = () => {
    const config = { get: jest.fn(() => 120000) };
    const log = { debug: jest.fn() };
    const retry = new RetryService({
      getService: (name: string) => (name === 'log' ? log : config),
    } as unknown as ConstructorParameters<typeof RetryService>[0]);
    const services = { config, find: { byCssSelector }, log, retry };
    const ctx = {
      getService: (name: keyof typeof services) => services[name],
    } as unknown as FtrProviderContext;

    return new TestSubjects(ctx);
  };

  beforeEach(() => {
    jest.useFakeTimers();
    byCssSelector.mockReset().mockResolvedValue({ isDisplayed, isEnabled });
    isDisplayed.mockReset().mockResolvedValue(true);
    isEnabled.mockReset();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('keeps polling while the element is disabled and resolves only once it is enabled', async () => {
    isEnabled.mockResolvedValueOnce(false).mockResolvedValueOnce(false).mockResolvedValue(true);
    const testSubjects = getTestSubjects();

    let settled = false;
    const result = testSubjects.waitForEnabled('selector', 5000).then(() => {
      settled = true;
    });

    // first probe: disabled, must not resolve the call
    await jest.advanceTimersByTimeAsync(50);
    expect(isEnabled).toHaveBeenCalledTimes(1);
    expect(settled).toBe(false);

    // second probe after the 100 ms retry delay: still disabled
    await jest.advanceTimersByTimeAsync(50);
    expect(isEnabled).toHaveBeenCalledTimes(2);
    expect(settled).toBe(false);

    // third probe: enabled
    await jest.advanceTimersByTimeAsync(100);
    await result;
    expect(settled).toBe(true);
    expect(isEnabled).toHaveBeenCalledTimes(3);
    // the element is re-queried on every probe rather than reused from the first lookup
    expect(byCssSelector).toHaveBeenCalledTimes(3);
    expect(byCssSelector).toHaveBeenCalledWith('[data-test-subj="selector"]', 120000);
  });

  it('keeps polling while the element is not displayed', async () => {
    isDisplayed.mockResolvedValueOnce(false).mockResolvedValue(true);
    isEnabled.mockResolvedValue(true);
    const testSubjects = getTestSubjects();

    const result = testSubjects.waitForEnabled('selector', 5000);

    await jest.advanceTimersByTimeAsync(100);
    await expect(result).resolves.toBeUndefined();
    expect(isDisplayed).toHaveBeenCalledTimes(2);
    // a hidden element short-circuits the probe before the enabled check
    expect(isEnabled).toHaveBeenCalledTimes(1);
  });

  it('throws a timeout error when the element stays disabled', async () => {
    isEnabled.mockResolvedValue(false);
    const testSubjects = getTestSubjects();

    const result = expect(testSubjects.waitForEnabled('selector', 250)).rejects.toThrow(
      'timed out waiting for testSubject(selector) to be displayed and enabled'
    );

    await jest.advanceTimersByTimeAsync(300);
    await result;
    // probes at 0, 100 and 200 ms; the 250 ms deadline, not the first disabled probe, ended the wait
    expect(isEnabled).toHaveBeenCalledTimes(3);
  });
});
