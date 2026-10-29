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
import type { UiSettingsParams, UserProvidedValues } from '@kbn/core-ui-settings-common';
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
  pollTicks$?: Observable<number>;
  sharedPollReads?: InflightReads<Record<string, UserProvidedValues>>;
  sharedUserProvidedCache?: NamespacedCache<Record<string, unknown>>;
  type?: 'config' | 'config-global';
  savedObjectsClient?: MockedSavedObjectsClient;
  pollClient?: MockedSavedObjectsClient;
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
      sharedPollReads = new InflightReads<Record<string, UserProvidedValues>>(),
      sharedUserProvidedCache,
      type = TYPE,
      savedObjectsClient = savedObjectsClientMock.create(),
      pollClient = savedObjectsClient,
      preserveSavedObjectsMock = false,
    } = options;

    if (!preserveSavedObjectsMock) {
      const doc = {
        type,
        id: ID,
        references: [],
        attributes: esDocSource,
      };
      savedObjectsClient.get.mockResolvedValue(doc);
      if (pollClient !== savedObjectsClient) {
        pollClient.get.mockResolvedValue(doc);
      }
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
      getPollClient: () => pollClient,
    });

    return { uiSettings, savedObjectsClient, pollClient, pollTicks$, sharedPollReads };
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

  it('warns once per shared read, not once per subscriber', async () => {
    const clearLogs = () => {
      jest.mocked(logger.warn).mockClear();
      jest.mocked(logger.debug).mockClear();
    };
    const pollTicks$ = interval(GET_OBSERVABLE_POLL_INTERVAL).pipe(share());
    const sharedPollReads = new InflightReads<Record<string, UserProvidedValues>>();
    const pollClient = savedObjectsClientMock.create();
    const invalidDoc = { type: TYPE, id: ID, references: [], attributes: { [KEY]: 123 } };
    pollClient.get.mockResolvedValue(invalidDoc);
    const subscribers = Array.from({ length: 5 }, () => {
      const savedObjectsClient = savedObjectsClientMock.create();
      savedObjectsClient.get.mockResolvedValue(invalidDoc);
      return watch<string>(
        setup({
          pollTicks$,
          sharedPollReads,
          savedObjectsClient,
          pollClient,
          preserveSavedObjectsMock: true,
        }).uiSettings.get$(KEY)
      );
    });
    await jest.advanceTimersByTimeAsync(0);
    expect(subscribers.map(({ values }) => values)).toEqual(
      Array.from({ length: 5 }, () => ['from-default'])
    );

    clearLogs();
    await jest.advanceTimersByTimeAsync(GET_OBSERVABLE_POLL_INTERVAL);
    expect(pollClient.get).toHaveBeenCalledTimes(1);
    expect(loggingSystemMock.collect(logger).warn.flat()).toEqual([
      expect.stringContaining('Ignore invalid UiSettings value'),
    ]);

    clearLogs();
    pollClient.get.mockRejectedValue(new Error('boom'));
    await jest.advanceTimersByTimeAsync(GET_OBSERVABLE_POLL_INTERVAL);
    expect(pollClient.get).toHaveBeenCalledTimes(2);
    const { warn, debug } = loggingSystemMock.collect(logger);
    expect(warn.flat()).toEqual([expect.stringContaining('skipped a poll')]);
    expect(debug.flat().filter((line) => String(line).includes('skipped a poll'))).toHaveLength(5);
  });

  it('starts a subscription after set() at the new value while a shared pre-write read is in flight', async () => {
    let stored = 'before';
    let holdNextRead = false;
    const pollTicks$ = interval(GET_OBSERVABLE_POLL_INTERVAL).pipe(share());
    const sharedPollReads = new InflightReads<Record<string, UserProvidedValues>>();
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

  it('does not let a subscription join a shared read left over from an earlier tick', async () => {
    let stored = 'before';
    let holdNextRead = false;
    const pollTicks$ = interval(GET_OBSERVABLE_POLL_INTERVAL).pipe(share());
    const sharedPollReads = new InflightReads<Record<string, UserProvidedValues>>();
    const savedObjectsClient = savedObjectsClientMock.create();
    const slowReadMs = GET_OBSERVABLE_POLL_INTERVAL * 1.5;
    savedObjectsClient.get.mockImplementation(() => {
      const response = { type: TYPE, id: ID, references: [], attributes: { [KEY]: stored } };
      if (holdNextRead) {
        holdNextRead = false;
        return new Promise((resolve) => setTimeout(() => resolve(response), slowReadMs));
      }
      return Promise.resolve(response);
    });

    const shared = {
      pollTicks$,
      sharedPollReads,
      savedObjectsClient,
      preserveSavedObjectsMock: true,
    };
    const warm = watch<string>(setup(shared).uiSettings.get$(KEY));
    await jest.advanceTimersByTimeAsync(0);
    expect(warm.values).toEqual(['before']);

    holdNextRead = true;
    await jest.advanceTimersByTimeAsync(GET_OBSERVABLE_POLL_INTERVAL);
    stored = 'after';
    const late = watch<string>(setup(shared).uiSettings.get$(KEY));
    await jest.advanceTimersByTimeAsync(0);
    expect(late.values).toEqual(['after']);

    await jest.advanceTimersByTimeAsync(slowReadMs);
    expect(late.values).toEqual(['after']);
    expect(warm.values).toEqual(['before']);

    await jest.advanceTimersByTimeAsync(GET_OBSERVABLE_POLL_INTERVAL);
    expect(late.values).toEqual(['after']);
    expect(warm.values).toEqual(['before', 'after']);
  });

  it('reads once per tick for many subscriptions on one space, plus one first read each', async () => {
    const pollTicks$ = interval(GET_OBSERVABLE_POLL_INTERVAL).pipe(share());
    const sharedPollReads = new InflightReads<Record<string, UserProvidedValues>>();
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

  it('reads ticks through the poll client', async () => {
    const savedObjectsClient = savedObjectsClientMock.create();
    const pollClient = savedObjectsClientMock.create();
    const { uiSettings } = setup({
      esDocSource: { [KEY]: 'one' },
      savedObjectsClient,
      pollClient,
    });
    watch<string>(uiSettings.get$(KEY));
    await jest.advanceTimersByTimeAsync(0);

    expect(savedObjectsClient.get).toHaveBeenCalledTimes(1);
    expect(pollClient.get).not.toHaveBeenCalled();

    await jest.advanceTimersByTimeAsync(GET_OBSERVABLE_POLL_INTERVAL * 3);

    expect(savedObjectsClient.get).toHaveBeenCalledTimes(1);
    expect(pollClient.get).toHaveBeenCalledTimes(3);
  });

  it('keeps emitting from the poll client after the subscriber client fails, and a later subscriber is unaffected', async () => {
    let stored = 'one';
    const pollTicks$ = interval(GET_OBSERVABLE_POLL_INTERVAL).pipe(share());
    const sharedPollReads = new InflightReads<Record<string, UserProvidedValues>>();
    const pollClient = savedObjectsClientMock.create();
    pollClient.get.mockImplementation(async () => ({
      type: TYPE,
      id: ID,
      references: [],
      attributes: { [KEY]: stored },
    }));

    const brokenClient = savedObjectsClientMock.create();
    let brokenReads = 0;
    brokenClient.get.mockImplementation(async () => {
      brokenReads += 1;
      if (brokenReads > 1) {
        throw SavedObjectsClient.errors.decorateForbiddenError(new Error('expired'));
      }
      return { type: TYPE, id: ID, references: [], attributes: { [KEY]: 'one' } };
    });
    const healthyClient = savedObjectsClientMock.create();
    healthyClient.get.mockResolvedValue({
      type: TYPE,
      id: ID,
      references: [],
      attributes: { [KEY]: 'one' },
    });

    const shared = {
      pollTicks$,
      sharedPollReads,
      pollClient,
      preserveSavedObjectsMock: true,
      namespace: 'space-1',
    };
    const broken = watch<string>(
      setup({ ...shared, savedObjectsClient: brokenClient }).uiSettings.get$(KEY)
    );
    const healthy = watch<string>(
      setup({ ...shared, savedObjectsClient: healthyClient }).uiSettings.get$(KEY)
    );
    await jest.advanceTimersByTimeAsync(0);
    expect(broken.values).toEqual(['one']);
    expect(healthy.values).toEqual(['one']);

    stored = 'two';
    await jest.advanceTimersByTimeAsync(GET_OBSERVABLE_POLL_INTERVAL);
    stored = 'three';
    await jest.advanceTimersByTimeAsync(GET_OBSERVABLE_POLL_INTERVAL);

    expect(broken.values).toEqual(['one', 'two', 'three']);
    expect(healthy.values).toEqual(['one', 'two', 'three']);
    expect(brokenClient.get).toHaveBeenCalledTimes(1);
    expect(healthyClient.get).toHaveBeenCalledTimes(1);
    expect(pollClient.get).toHaveBeenCalledTimes(2);
  });

  it('does not emit or use the poll client until the subscriber client stops returning Forbidden', async () => {
    const savedObjectsClient = savedObjectsClientMock.create();
    const pollClient = savedObjectsClientMock.create();
    savedObjectsClient.get.mockRejectedValue(
      SavedObjectsClient.errors.decorateForbiddenError(new Error('forbidden'))
    );
    pollClient.get.mockResolvedValue({
      type: TYPE,
      id: ID,
      references: [],
      attributes: { [KEY]: 'from-poll' },
    });
    const { uiSettings } = setup({
      savedObjectsClient,
      pollClient,
      preserveSavedObjectsMock: true,
    });
    const seen = watch<string>(uiSettings.get$(KEY));
    await jest.advanceTimersByTimeAsync(0);
    await jest.advanceTimersByTimeAsync(GET_OBSERVABLE_POLL_INTERVAL * 2);

    expect(seen.values).toEqual([]);
    expect(seen.error()).toBeUndefined();
    expect(pollClient.get).not.toHaveBeenCalled();
    expect(savedObjectsClient.get).toHaveBeenCalledTimes(3);

    savedObjectsClient.get.mockResolvedValue({
      type: TYPE,
      id: ID,
      references: [],
      attributes: { [KEY]: 'recovered' },
    });
    await jest.advanceTimersByTimeAsync(GET_OBSERVABLE_POLL_INTERVAL);
    expect(seen.values).toEqual(['recovered']);
    expect(pollClient.get).not.toHaveBeenCalled();

    await jest.advanceTimersByTimeAsync(GET_OBSERVABLE_POLL_INTERVAL);
    expect(seen.values).toEqual(['recovered', 'from-poll']);
    expect(pollClient.get).toHaveBeenCalledTimes(1);
    expect(savedObjectsClient.get).toHaveBeenCalledTimes(4);
  });

  it('switches to the shared poll client after Elasticsearch is available again', async () => {
    let stored = 'one';
    const pollTicks$ = interval(GET_OBSERVABLE_POLL_INTERVAL).pipe(share());
    const sharedPollReads = new InflightReads<Record<string, UserProvidedValues>>();
    const pollClient = savedObjectsClientMock.create();
    pollClient.get.mockImplementation(async () => ({
      type: TYPE,
      id: ID,
      references: [],
      attributes: { [KEY]: stored },
    }));

    const failingClient = savedObjectsClientMock.create();
    let attempts = 0;
    failingClient.get.mockImplementation(async () => {
      attempts += 1;
      if (attempts === 1) {
        throw SavedObjectsClient.errors.decorateEsUnavailableError(new Error('unavailable'));
      }
      return { type: TYPE, id: ID, references: [], attributes: { [KEY]: 'one' } };
    });
    const otherClient = savedObjectsClientMock.create();
    otherClient.get.mockResolvedValue({
      type: TYPE,
      id: ID,
      references: [],
      attributes: { [KEY]: 'one' },
    });

    const shared = {
      pollTicks$,
      sharedPollReads,
      pollClient,
      preserveSavedObjectsMock: true,
      namespace: 'space-1',
    };
    const failing = watch<string>(
      setup({ ...shared, savedObjectsClient: failingClient }).uiSettings.get$(KEY)
    );
    const other = watch<string>(
      setup({ ...shared, savedObjectsClient: otherClient }).uiSettings.get$(KEY)
    );
    await jest.advanceTimersByTimeAsync(0);
    expect(failing.values).toEqual([]);
    expect(other.values).toEqual(['one']);
    expect(pollClient.get).not.toHaveBeenCalled();

    await jest.advanceTimersByTimeAsync(GET_OBSERVABLE_POLL_INTERVAL);
    expect(failing.values).toEqual(['one']);
    expect(other.values).toEqual(['one']);
    expect(failingClient.get).toHaveBeenCalledTimes(2);
    expect(pollClient.get).toHaveBeenCalledTimes(1);

    stored = 'two';
    await jest.advanceTimersByTimeAsync(GET_OBSERVABLE_POLL_INTERVAL);
    expect(failing.values).toEqual(['one', 'two']);
    expect(other.values).toEqual(['one', 'two']);
    expect(failingClient.get).toHaveBeenCalledTimes(2);
    expect(otherClient.get).toHaveBeenCalledTimes(1);
    expect(pollClient.get).toHaveBeenCalledTimes(2);
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
