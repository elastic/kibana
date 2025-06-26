/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { OpenFeature, type Provider } from '@openfeature/server-sdk';
import { setProviderWithRetries } from './set_provider_with_retries';
import { loggerMock, type MockedLogger } from '@kbn/logging-mocks';

describe('setProviderWithRetries', () => {
  const fakeProvider = { metadata: { name: 'fake provider' } } as Provider;
  let logger: MockedLogger;

  beforeEach(() => {
    jest.useFakeTimers();
    logger = loggerMock.create();
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.clearAllMocks();
    jest.useRealTimers();
  });

  test('sets the provider and logs the success', async () => {
    expect.assertions(3);
    const spy = jest.spyOn(OpenFeature, 'setProviderAndWait');

    setProviderWithRetries(fakeProvider, logger);

    expect(spy).toHaveBeenCalledWith(fakeProvider);
    expect(spy).toHaveBeenCalledTimes(1);

    await jest.runAllTimersAsync();

    expect(logger.info.mock.calls).toMatchInlineSnapshot(`
      Array [
        Array [
          "Feature flags provider successfully set up.",
        ],
      ]
    `);
  });

  test('should retry up to 5 times (and does not throw/reject)', async () => {
    expect.assertions(15);
    const spy = jest
      .spyOn(OpenFeature, 'setProviderAndWait')
      .mockRejectedValue(new Error('Something went terribly wrong!'));

    setProviderWithRetries(fakeProvider, logger);

    expect(spy).toHaveBeenCalledWith(fakeProvider);

    // Initial attempt
    expect(spy).toHaveBeenCalledTimes(1);

    // 5 retries
    for (let i = 0; i < 5; i++) {
      await jest.advanceTimersByTimeAsync(1000 * Math.pow(2, i)); // exponential backoff of factor 2
      expect(spy).toHaveBeenCalledTimes(i + 2);
      expect(logger.warn).toHaveBeenCalledTimes(i + 2);
    }

    // Given up retrying
    await jest.advanceTimersByTimeAsync(32000);
    expect(spy).toHaveBeenCalledTimes(6);

    expect(logger.warn.mock.calls).toMatchInlineSnapshot(`
      Array [
        Array [
          "Failed to set up the feature flags provider: Something went terribly wrong!. Retrying 5 times more...",
          Object {
            "error": [Error: Something went terribly wrong!],
          },
        ],
        Array [
          "Failed to set up the feature flags provider: Something went terribly wrong!. Retrying 4 times more...",
          Object {
            "error": [Error: Something went terribly wrong!],
          },
        ],
        Array [
          "Failed to set up the feature flags provider: Something went terribly wrong!. Retrying 3 times more...",
          Object {
            "error": [Error: Something went terribly wrong!],
          },
        ],
        Array [
          "Failed to set up the feature flags provider: Something went terribly wrong!. Retrying 2 times more...",
          Object {
            "error": [Error: Something went terribly wrong!],
          },
        ],
        Array [
          "Failed to set up the feature flags provider: Something went terribly wrong!. Retrying 1 times more...",
          Object {
            "error": [Error: Something went terribly wrong!],
          },
        ],
        Array [
          "Failed to set up the feature flags provider: Something went terribly wrong!. Retrying 0 times more...",
          Object {
            "error": [Error: Something went terribly wrong!],
          },
        ],
      ]
    `);
    expect(logger.error.mock.calls).toMatchInlineSnapshot(`
      Array [
        Array [
          "Failed to set up the feature flags provider: Something went terribly wrong!",
          Object {
            "error": [Error: Something went terribly wrong!],
          },
        ],
      ]
    `);
  });
});
