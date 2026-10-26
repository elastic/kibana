/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { savedObjectsRepositoryMock } from '@kbn/core-saved-objects-api-server-mocks';
import type { SavedObjectsBulkResponse } from '@kbn/core-saved-objects-api-server';
import type { UserProvided } from './clients/user_provided';
import { parseUserProvided } from './clients/user_provided';
import type { ConfigDocRef } from './ui_settings_watcher';
import { GLOBAL_NAMESPACE, UiSettingsWatcher } from './ui_settings_watcher';

const ID = '9.6.0';
const BUILD_NUM = 42;
const POLL_INTERVAL = 10_000;
const DEFAULT_REF: ConfigDocRef = { type: 'config', namespace: 'default' };
const SPACE_REF: ConfigDocRef = { type: 'config', namespace: 'space-a' };
const GLOBAL_REF: ConfigDocRef = { type: 'config-global', namespace: GLOBAL_NAMESPACE };

const flush = () => jest.advanceTimersByTimeAsync(0);
const nextPoll = () => jest.advanceTimersByTimeAsync(POLL_INTERVAL);

const setup = () => {
  const repository = savedObjectsRepositoryMock.create();
  const log = loggingSystemMock.createLogger();
  const cache = { del: jest.fn() };
  const stored = new Map<string, { version: string; attributes: Record<string, unknown> }>();
  let versionCounter = 0;

  const store = (namespace: string, attributes: Record<string, unknown>) =>
    stored.set(namespace, { version: `v${++versionCounter}`, attributes });

  repository.bulkGet.mockImplementation(async (objects) => ({
    saved_objects: objects.map(({ type, id, namespaces }) => {
      const doc = stored.get(namespaces?.[0] ?? GLOBAL_NAMESPACE);
      return doc
        ? { type, id, references: [], ...doc }
        : { type, id, references: [], error: { statusCode: 404, error: 'Not Found', message: '' } };
    }),
  }));
  repository.find.mockResolvedValue({ saved_objects: [], total: 0, per_page: 1000, page: 1 });

  const watcher = new UiSettingsWatcher({
    repository,
    id: ID,
    buildNum: BUILD_NUM,
    cache,
    pollInterval: POLL_INTERVAL,
    parse: (_ref, attributes) =>
      parseUserProvided(attributes, { defaults: {}, overrides: {} }, log),
    log,
  });

  const collect = (ref: ConfigDocRef) => {
    const values: UserProvided[] = [];
    let completed = false;
    const subscription = watcher.watch(ref).subscribe({
      next: (value) => values.push(value),
      complete: () => {
        completed = true;
      },
    });
    return { values, subscription, isCompleted: () => completed };
  };

  return { repository, log, cache, store, watcher, collect };
};

describe('UiSettingsWatcher', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('reads a doc when it gets its first subscriber, scoped to its namespace', async () => {
    const { repository, store, collect } = setup();
    store('space-a', { foo: 'bar', removed: null });

    const { values } = collect(SPACE_REF);
    expect(values).toEqual([]);
    await flush();

    expect(repository.bulkGet).toHaveBeenCalledTimes(1);
    expect(repository.bulkGet).toHaveBeenCalledWith([
      { type: 'config', id: ID, namespaces: ['space-a'] },
    ]);
    expect(values).toEqual([{ foo: { userValue: 'bar' } }]);
  });

  it('reads every watched doc with one bulkGet per poll', async () => {
    const { repository, store, collect } = setup();
    store('default', { foo: 'a' });
    store(GLOBAL_NAMESPACE, { foo: 'g' });
    collect(DEFAULT_REF);
    collect(GLOBAL_REF);
    await flush();
    repository.bulkGet.mockClear();

    await nextPoll();

    expect(repository.bulkGet).toHaveBeenCalledTimes(1);
    expect(repository.bulkGet).toHaveBeenCalledWith([
      { type: 'config', id: ID, namespaces: ['default'] },
      { type: 'config-global', id: ID },
    ]);
  });

  it('emits when the values change and not when a write keeps them equal', async () => {
    const { store, collect } = setup();
    store('default', { foo: 'a' });
    const { values } = collect(DEFAULT_REF);
    await flush();

    store('default', { foo: 'a' });
    await nextPoll();
    await nextPoll();
    expect(values).toEqual([{ foo: { userValue: 'a' } }]);

    store('default', { foo: 'b' });
    await nextPoll();
    expect(values).toEqual([{ foo: { userValue: 'a' } }, { foo: { userValue: 'b' } }]);
  });

  it('invalidates the cache entry of a doc only when its values change', async () => {
    const { cache, store, collect } = setup();
    store('space-a', { foo: 'a' });
    collect(SPACE_REF);
    await flush();
    cache.del.mockClear();

    store('space-a', { foo: 'a' });
    await nextPoll();
    expect(cache.del).not.toHaveBeenCalled();

    store('space-a', { foo: 'b' });
    await nextPoll();
    expect(cache.del).toHaveBeenCalledTimes(1);
    expect(cache.del).toHaveBeenCalledWith('space-a');
  });

  it('replays the last value to a late subscriber without reading again', async () => {
    const { repository, store, collect } = setup();
    store('default', { foo: 'a' });
    collect(DEFAULT_REF);
    await flush();

    const late = collect(DEFAULT_REF);
    await flush();

    expect(late.values).toEqual([{ foo: { userValue: 'a' } }]);
    expect(repository.bulkGet).toHaveBeenCalledTimes(1);
  });

  it('stops polling once the last subscriber unsubscribes', async () => {
    const { repository, store, collect } = setup();
    store('default', { foo: 'a' });
    const first = collect(DEFAULT_REF);
    const second = collect(DEFAULT_REF);
    await flush();

    first.subscription.unsubscribe();
    await nextPoll();
    expect(repository.bulkGet).toHaveBeenCalledTimes(2);

    second.subscription.unsubscribe();
    await nextPoll();
    await nextPoll();
    expect(repository.bulkGet).toHaveBeenCalledTimes(2);
    expect(jest.getTimerCount()).toBe(0);
  });

  it('emits the upgraded values of a missing doc without writing, and computes them once', async () => {
    const { repository, collect } = setup();
    repository.find.mockResolvedValue({
      saved_objects: [
        {
          type: 'config',
          id: '9.5.0',
          attributes: { buildNum: 1, foo: 'from 9.5.0' },
          references: [],
          score: 1,
        },
      ],
      total: 1,
      per_page: 1000,
      page: 1,
    });

    const { values } = collect(SPACE_REF);
    await flush();
    await nextPoll();
    await nextPoll();

    expect(values).toEqual([
      {
        buildNum: { userValue: BUILD_NUM },
        isDefaultIndexMigrated: { userValue: true },
        foo: { userValue: 'from 9.5.0' },
      },
    ]);
    expect(repository.find).toHaveBeenCalledTimes(1);
    expect(repository.find).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'config', namespaces: ['space-a'] })
    );
    expect(repository.create).not.toHaveBeenCalled();
    expect(repository.update).not.toHaveBeenCalled();
  });

  it('does not emit when a missing doc gets created with its upgraded values', async () => {
    const { store, collect } = setup();
    const { values } = collect(DEFAULT_REF);
    await flush();

    store('default', { buildNum: BUILD_NUM, isDefaultIndexMigrated: true });
    await nextPoll();

    expect(values).toHaveLength(1);
  });

  it('keeps the last value while reads fail, warns once, and logs the recovery', async () => {
    const { repository, log, store, collect } = setup();
    store('default', { foo: 'a' });
    const { values, isCompleted } = collect(DEFAULT_REF);
    await flush();

    const bulkGet = repository.bulkGet.getMockImplementation()!;
    repository.bulkGet.mockRejectedValue(new Error('es down'));
    await nextPoll();
    await nextPoll();

    expect(values).toEqual([{ foo: { userValue: 'a' } }]);
    expect(isCompleted()).toBe(false);
    expect(log.warn).toHaveBeenCalledTimes(1);
    expect(log.warn.mock.calls[0][0]).toContain('es down');

    repository.bulkGet.mockImplementation(bulkGet);
    store('default', { foo: 'b' });
    await nextPoll();

    expect(values).toEqual([{ foo: { userValue: 'a' } }, { foo: { userValue: 'b' } }]);
    expect(log.info).toHaveBeenCalledTimes(1);
    expect(log.warn).toHaveBeenCalledTimes(1);
  });

  it('keeps polling after a poll throws unexpectedly, and emits the change it missed', async () => {
    const { repository, log, cache, store, collect } = setup();
    store('default', { foo: 'a' });
    cache.del.mockImplementationOnce(() => {
      throw new Error('unexpected');
    });

    const { values } = collect(DEFAULT_REF);
    await flush();
    expect(values).toEqual([]);
    expect(log.warn.mock.calls[0][0]).toContain('unexpected');

    repository.bulkGet.mockClear();
    await nextPoll();

    expect(repository.bulkGet).toHaveBeenCalledTimes(1);
    expect(values).toEqual([{ foo: { userValue: 'a' } }]);
    expect(log.info).toHaveBeenCalledTimes(1);
  });

  it('does not emit anything until the first read succeeds', async () => {
    const { repository, collect } = setup();
    repository.bulkGet.mockRejectedValue(new Error('es down'));

    const { values } = collect(DEFAULT_REF);
    await flush();
    await nextPoll();

    expect(values).toEqual([]);
  });

  it('re-reads a watched doc right away after a local write', async () => {
    const { repository, watcher, store, collect } = setup();
    store('default', { foo: 'a' });
    const { values } = collect(DEFAULT_REF);
    await flush();

    store('default', { foo: 'b' });
    watcher.notifyLocalWrite(DEFAULT_REF);
    await flush();

    expect(repository.bulkGet).toHaveBeenCalledTimes(2);
    expect(values).toEqual([{ foo: { userValue: 'a' } }, { foo: { userValue: 'b' } }]);

    watcher.notifyLocalWrite(SPACE_REF);
    await flush();
    expect(repository.bulkGet).toHaveBeenCalledTimes(2);
  });

  it('reads once more after an in-flight read when a local write lands during it', async () => {
    const { repository, watcher, store, collect } = setup();
    store('default', { foo: 'a' });
    const { values } = collect(DEFAULT_REF);
    await flush();

    const bulkGet = repository.bulkGet.getMockImplementation()!;
    let releaseRead!: () => void;
    repository.bulkGet.mockImplementationOnce(async (objects) => {
      const response = await bulkGet(objects);
      await new Promise<void>((resolve) => (releaseRead = resolve));
      return response as SavedObjectsBulkResponse<unknown>;
    });

    await nextPoll();
    expect(repository.bulkGet).toHaveBeenCalledTimes(2);

    store('default', { foo: 'b' });
    watcher.notifyLocalWrite(DEFAULT_REF);
    watcher.notifyLocalWrite(DEFAULT_REF);
    await flush();
    expect(repository.bulkGet).toHaveBeenCalledTimes(2);

    releaseRead();
    await flush();

    expect(repository.bulkGet).toHaveBeenCalledTimes(3);
    expect(values).toEqual([{ foo: { userValue: 'a' } }, { foo: { userValue: 'b' } }]);
  });

  it('completes every stream on stop, stops polling, and completes later subscriptions at once', async () => {
    const { repository, watcher, store, collect } = setup();
    store('default', { foo: 'a' });
    const active = collect(DEFAULT_REF);
    await flush();

    watcher.stop();
    await nextPoll();

    expect(active.isCompleted()).toBe(true);
    expect(repository.bulkGet).toHaveBeenCalledTimes(1);

    const late = collect(DEFAULT_REF);
    expect(late.isCompleted()).toBe(true);
    expect(late.values).toEqual([]);
  });
});
