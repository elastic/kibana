/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { FtrProviderContext } from './ftr_provider_context';
import { TestSubjects } from './test_subjects';

describe('TestSubjects existence checks', () => {
  const existsByCssSelector = jest.fn();
  const existsByDisplayedByCssSelector = jest.fn();

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
      find: { existsByCssSelector, existsByDisplayedByCssSelector },
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
});
