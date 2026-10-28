/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Observable, Subscription } from 'rxjs';
import { interval, Subject } from 'rxjs';
import { share } from 'rxjs';
import { schema } from '@kbn/config-schema';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { SavedObjectsClient } from '@kbn/core-saved-objects-api-server-internal';
import { savedObjectsClientMock } from '@kbn/core-saved-objects-api-server-mocks';
import type { UiSettingsParams } from '@kbn/core-ui-settings-common';
import { GET_OBSERVABLE_POLL_INTERVAL } from './ui_settings_client_common';
import { UiSettingsClient } from './ui_settings_client';
import { UiSettingsGlobalClient } from './ui_settings_global_client';
import { InflightReads } from '../inflight_reads';
import { NamespacedCache } from '../namespaced_cache';

const logger = loggingSystemMock.create().get();
const TYPE = 'config';
const ID = 'kibana-version';
const BUILD_NUM = 1234;
const KEY = 'watched';

type MockedSavedObjectsClient = ReturnType<typeof savedObjectsClientMock.create>;

interface SetupOptions {
  defaults?: Record<string, UiSettingsParams>;
  esDocSource?: Record<string, unknown>;
  overrides?: Record<string, unknown>;
  namespace?: string;
  pollTicks$?: Observable<unknown>;
  sharedPollReads?: InflightReads<Record<string, unknown>>;
  sharedUserProvidedCache?: NamespacedCache<Record<string, unknown>>;
  type?: 'config' | 'config-global';
  savedObjectsClient?: MockedSavedObjectsClient;
  preserveSavedObjectsMock?: boolean;
}

describe('UiSettingsClient.get$', () => {
  const subscriptions: Subscription[] = [];

  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    subscriptions.splice(0).forEach((subscription) => subscription.unsubscribe());
    jest.useRealTimers();
  });

  const watch = <T>(source: Observable<T>) => {
    const values: T[] = [];
    let completed = false;
    let errored: unknown;
    subscriptions.push(
      source.subscribe({
        next: (value) => values.push(value),
        error: (error) => {
          errored = error;
        },
        complete: () => {
          completed = true;
        },
      })
    );
    return {
      values,
      isCompleted: () => completed,
      error: () => errored,
    };
  };

  function setup(options: SetupOptions = {}) {
    const {
      defaults = { [KEY]: { value: 'from-default', schema: schema.string() } },
      esDocSource = {},
      overrides = {},
      namespace = 'default',
      pollTicks$ = interval(GET_OBSERVABLE_POLL_INTERVAL).pipe(share()),
      sharedPollReads = new InflightReads<Record<string, unknown>>(),
      sharedUserProvidedCache,
      type = TYPE,
      savedObjectsClient = savedObjectsClientMock.create(),
      preserveSavedObjectsMock = false,
    } = options;

    if (!preserveSavedObjectsMock) {
      savedObjectsClient.get.mockResolvedValue({
        type,
        id: ID,
        references: [],
        attributes: esDocSource,
      });
    }

    const Client = type === 'config-global' ? UiSettingsGlobalClient : UiSettingsClient;
    const uiSettings = new Client({
      type,
      id: ID,
      buildNum: BUILD_NUM,
      defaults,
      savedObjectsClient,
      overrides,
      log: logger,
      namespace,
      pollTicks$,
      sharedPollReads,
      sharedUserProvidedCache,
    });

    return { uiSettings, savedObjectsClient, pollTicks$, sharedPollReads };
  }

  it('emits the value get() would return without a request', async () => {
    const { uiSettings } = setup({ esDocSource: { [KEY]: 'from-user' } });
    const seen = watch<string>(uiSettings.get$(KEY));

    await jest.advanceTimersByTimeAsync(0);

    expect(seen.values).toEqual([await uiSettings.get(KEY)]);
    expect(seen.values).toEqual(['from-user']);
    expect(seen.isCompleted()).toBe(false);
    expect(seen.error()).toBeUndefined();
  });

  it('emits the default when the user has not set the key', async () => {
    const { uiSettings } = setup();
    const seen = watch<string>(uiSettings.get$(KEY));

    await jest.advanceTimersByTimeAsync(0);

    expect(seen.values).toEqual(['from-default']);
  });

  it('emits a change written behind the client within one interval', async () => {
    const attributes: Record<string, unknown> = { [KEY]: 'one' };
    const { uiSettings } = setup({ esDocSource: attributes });
    const seen = watch<string>(uiSettings.get$(KEY));
    await jest.advanceTimersByTimeAsync(0);

    attributes[KEY] = 'two';
    await jest.advanceTimersByTimeAsync(GET_OBSERVABLE_POLL_INTERVAL);

    expect(seen.values).toEqual(['one', 'two']);
  });

  it('does not emit when the value is unchanged', async () => {
    const { uiSettings } = setup({ esDocSource: { [KEY]: 'same' } });
    const seen = watch<string>(uiSettings.get$(KEY));
    await jest.advanceTimersByTimeAsync(0);

    await jest.advanceTimersByTimeAsync(GET_OBSERVABLE_POLL_INTERVAL * 3);

    expect(seen.values).toEqual(['same']);
  });

  it('keeps the last value through 30 seconds of Forbidden errors, then recovers', async () => {
    const { uiSettings, savedObjectsClient } = setup({ esDocSource: { [KEY]: 'from-user' } });
    const seen = watch<string>(uiSettings.get$(KEY));
    await jest.advanceTimersByTimeAsync(0);

    savedObjectsClient.get.mockRejectedValue(
      SavedObjectsClient.errors.decorateForbiddenError(new Error('forbidden'))
    );
    await jest.advanceTimersByTimeAsync(GET_OBSERVABLE_POLL_INTERVAL * 3);
    expect(seen.values).toEqual(['from-user']);
    expect(seen.error()).toBeUndefined();

    savedObjectsClient.get.mockResolvedValue({
      type: TYPE,
      id: ID,
      references: [],
      attributes: { [KEY]: 'recovered' },
    });
    await jest.advanceTimersByTimeAsync(GET_OBSERVABLE_POLL_INTERVAL);

    expect(seen.values).toEqual(['from-user', 'recovered']);
  });

  it('keeps the last value through 30 seconds of Elasticsearch unavailability, then recovers', async () => {
    const { uiSettings, savedObjectsClient } = setup({ esDocSource: { [KEY]: 'from-user' } });
    const seen = watch<string>(uiSettings.get$(KEY));
    await jest.advanceTimersByTimeAsync(0);

    savedObjectsClient.get.mockRejectedValue(
      SavedObjectsClient.errors.decorateEsUnavailableError(new Error('unavailable'))
    );
    await jest.advanceTimersByTimeAsync(GET_OBSERVABLE_POLL_INTERVAL * 3);
    expect(seen.values).toEqual(['from-user']);
    expect(seen.error()).toBeUndefined();

    savedObjectsClient.get.mockResolvedValue({
      type: TYPE,
      id: ID,
      references: [],
      attributes: { [KEY]: 'recovered' },
    });
    await jest.advanceTimersByTimeAsync(GET_OBSERVABLE_POLL_INTERVAL);

    expect(seen.values).toEqual(['from-user', 'recovered']);
  });

  it('skips a poll that fails with a generic error', async () => {
    const { uiSettings, savedObjectsClient } = setup({ esDocSource: { [KEY]: 'from-user' } });
    const seen = watch<string>(uiSettings.get$(KEY));
    await jest.advanceTimersByTimeAsync(0);

    savedObjectsClient.get.mockRejectedValue(new Error('boom'));
    await jest.advanceTimersByTimeAsync(GET_OBSERVABLE_POLL_INTERVAL);

    expect(seen.values).toEqual(['from-user']);
    expect(seen.error()).toBeUndefined();
    expect(loggingSystemMock.collect(logger).warn.flat()).toEqual(
      expect.arrayContaining([expect.stringContaining('skipped a poll')])
    );
  });

  it('starts a subscription after set() at the new value while a shared pre-write read is in flight', async () => {
    let stored = 'before';
    let holdNextRead = false;
    const pollTicks$ = interval(GET_OBSERVABLE_POLL_INTERVAL).pipe(share());
    const sharedPollReads = new InflightReads<Record<string, unknown>>();
    const savedObjectsClient = savedObjectsClientMock.create();
    const slowReadMs = 5_000;
    savedObjectsClient.get.mockImplementation(() => {
      const snapshot = stored;
      if (holdNextRead) {
        holdNextRead = false;
        return new Promise((resolve) => {
          setTimeout(() => {
            resolve({
              type: TYPE,
              id: ID,
              references: [],
              attributes: { [KEY]: snapshot },
            });
          }, slowReadMs);
        });
      }
      return Promise.resolve({
        type: TYPE,
        id: ID,
        references: [],
        attributes: { [KEY]: snapshot },
      });
    });
    savedObjectsClient.update.mockImplementation(async (_type, _id, changes) => {
      stored = String((changes as Record<string, unknown>)[KEY]);
      return {} as Awaited<ReturnType<typeof savedObjectsClient.update>>;
    });

    const shared = {
      pollTicks$,
      sharedPollReads,
      savedObjectsClient,
      preserveSavedObjectsMock: true,
    };
    const { uiSettings } = setup(shared);
    const warm = watch<string>(uiSettings.get$(KEY));
    await jest.advanceTimersByTimeAsync(0);
    expect(warm.values).toEqual(['before']);

    holdNextRead = true;
    await jest.advanceTimersByTimeAsync(GET_OBSERVABLE_POLL_INTERVAL);
    expect(savedObjectsClient.get.mock.calls.length).toBeGreaterThan(1);

    await uiSettings.set(KEY, 'after');
    const late = watch<string>(setup(shared).uiSettings.get$(KEY));
    await jest.advanceTimersByTimeAsync(0);

    expect(late.values).toEqual(['after']);
    expect(warm.values).toEqual(['before']);

    await jest.advanceTimersByTimeAsync(slowReadMs);
    expect(warm.values).toEqual(['before']);
    await jest.advanceTimersByTimeAsync(GET_OBSERVABLE_POLL_INTERVAL);
    expect(warm.values).toEqual(['before', 'after']);
  });

  it('reads once per tick for many subscriptions on one space, plus one first read each', async () => {
    const pollTicks$ = interval(GET_OBSERVABLE_POLL_INTERVAL).pipe(share());
    const sharedPollReads = new InflightReads<Record<string, unknown>>();
    const savedObjectsClient = savedObjectsClientMock.create();
    const subscriberCount = 4;
    const clients = Array.from(
      { length: subscriberCount },
      () =>
        setup({
          esDocSource: { [KEY]: 'one' },
          pollTicks$,
          sharedPollReads,
          savedObjectsClient,
        }).uiSettings
    );

    clients.forEach((client) => watch(client.get$(KEY)));
    await jest.advanceTimersByTimeAsync(0);
    expect(savedObjectsClient.get).toHaveBeenCalledTimes(subscriberCount);

    await jest.advanceTimersByTimeAsync(GET_OBSERVABLE_POLL_INTERVAL);
    expect(savedObjectsClient.get).toHaveBeenCalledTimes(subscriberCount + 1);
    await jest.advanceTimersByTimeAsync(GET_OBSERVABLE_POLL_INTERVAL);
    expect(savedObjectsClient.get).toHaveBeenCalledTimes(subscriberCount + 2);
  });

  it('stops reading after the last subscriber unsubscribes', async () => {
    const { uiSettings, savedObjectsClient } = setup({ esDocSource: { [KEY]: 'one' } });
    const subscription = uiSettings.get$(KEY).subscribe();
    await jest.advanceTimersByTimeAsync(0);
    const readsWhileSubscribed = savedObjectsClient.get.mock.calls.length;

    subscription.unsubscribe();
    await jest.advanceTimersByTimeAsync(GET_OBSERVABLE_POLL_INTERVAL * 3);

    expect(savedObjectsClient.get.mock.calls.length).toBe(readsWhileSubscribed);
  });

  it('throws synchronously for a key whose default depends on the request', async () => {
    const { uiSettings } = setup({
      defaults: {
        [KEY]: {
          value: 'fallback',
          schema: schema.string(),
          getValue: async () => 'from-request',
        },
      },
    });

    expect(() => uiSettings.get$(KEY)).toThrow(KEY);
    expect(() => uiSettings.get$(KEY)).toThrow(/request/);
    await expect(uiSettings.get(KEY)).resolves.toBe('from-request');
  });

  it('emits an override instead of the saved value', async () => {
    const { uiSettings } = setup({
      esDocSource: { [KEY]: 'from-es' },
      overrides: { [KEY]: 'from-override' },
    });
    const seen = watch<string>(uiSettings.get$(KEY));

    await jest.advanceTimersByTimeAsync(0);

    expect(seen.values).toEqual(['from-override']);
  });

  it('does not read or write the shared user-provided cache', async () => {
    const namespace = 'default';
    const sharedUserProvidedCache = new NamespacedCache<Record<string, unknown>>();
    sharedUserProvidedCache.set(namespace, { [KEY]: { userValue: 'stale' } });
    const { uiSettings } = setup({
      esDocSource: { [KEY]: 'fresh' },
      namespace,
      sharedUserProvidedCache,
    });
    const seen = watch<string>(uiSettings.get$(KEY));
    await jest.advanceTimersByTimeAsync(0);

    expect(seen.values).toEqual(['fresh']);
    expect(sharedUserProvidedCache.get(namespace)).toEqual({ [KEY]: { userValue: 'stale' } });
    await expect(uiSettings.get(KEY)).resolves.toBe('stale');
  });

  it('reads a global setting through the global saved object type', async () => {
    const { uiSettings, savedObjectsClient } = setup({
      type: 'config-global',
      namespace: '__global__',
      esDocSource: { [KEY]: 'global-value' },
    });
    const seen = watch<string>(uiSettings.get$(KEY));
    await jest.advanceTimersByTimeAsync(0);

    expect(seen.values).toEqual(['global-value']);
    expect(savedObjectsClient.get).toHaveBeenCalledWith('config-global', ID);
  });

  it('completes when the poll ticks complete', async () => {
    const pollTicks$ = new Subject<number>();
    const { uiSettings } = setup({ esDocSource: { [KEY]: 'one' }, pollTicks$ });
    const seen = watch<string>(uiSettings.get$(KEY));
    await jest.advanceTimersByTimeAsync(0);
    expect(seen.values).toEqual(['one']);
    expect(seen.isCompleted()).toBe(false);

    pollTicks$.complete();
    await jest.advanceTimersByTimeAsync(0);

    expect(seen.isCompleted()).toBe(true);
    expect(seen.values).toEqual(['one']);
  });
});
