/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { lastValueFrom } from 'rxjs';
import type { Request } from '@kbn/inspector-plugin/common';
import { RequestStatus } from '@kbn/inspector-plugin/common';
import { createReplayKey } from '../../../common/search/create_replay_key';
import { NOT_IN_SNAPSHOT_ERROR, ReplayRegistry } from './replay_registry';

const hitsParams = { index: 'logs', body: { query: { match_all: {} }, size: 10 } };
const aggsParams = {
  index: 'logs',
  body: { size: 0, aggs: { histo: { date_histogram: { time_zone: 'UTC' } } } },
};

const recorded = (
  id: string,
  params: { body: object },
  startTime: number,
  withKey = true
): Request => ({
  id,
  name: id,
  startTime,
  status: RequestStatus.OK,
  json: params.body,
  replayKey: withKey ? createReplayKey(params) : undefined,
  response: { json: { rawResponse: { id }, isRunning: true } },
});

const SESSION = 'session-1';

const respond = (registry: ReplayRegistry, params: object, sessionId = SESSION) =>
  lastValueFrom(registry.match({ params }, sessionId)!);

const activate = (registry: ReplayRegistry, ...args: Parameters<ReplayRegistry['activate']>) => {
  const session = registry.activate(...args);
  session.addSessionId(SESSION);
  return session;
};

describe('ReplayRegistry', () => {
  it('does nothing when not active', () => {
    expect(new ReplayRegistry().match({ params: hitsParams }, SESSION)).toBeUndefined();
  });

  it('serves an exact key hit and ignores preference', async () => {
    const registry = new ReplayRegistry();
    activate(registry, [recorded('aggs', aggsParams, 1), recorded('hits', hitsParams, 2)]);

    const response = await respond(registry, { ...hitsParams, preference: 123 });
    expect(response.rawResponse).toEqual({ id: 'hits' });
    expect(response.isRunning).toBe(false);
    expect(response.isPartial).toBe(false);
  });

  it('falls back to the request kind in order of arrival when the key differs', async () => {
    const registry = new ReplayRegistry();
    activate(registry, [recorded('aggs-1', aggsParams, 1), recorded('aggs-2', aggsParams, 2)]);
    const otherTz = {
      ...aggsParams,
      body: { size: 0, aggs: { histo: { date_histogram: { time_zone: 'Europe/Vienna' } } } },
    };

    expect((await respond(registry, otherTz)).rawResponse).toEqual({ id: 'aggs-1' });
    expect((await respond(registry, otherTz)).rawResponse).toEqual({ id: 'aggs-2' });
  });

  it('prefers the same ES|QL query text over arrival order when the key differs', async () => {
    const registry = new ReplayRegistry();
    const table = { query: 'FROM logs | LIMIT 500', time_zone: 'UTC' };
    const histogram = { query: 'FROM logs | STATS count = COUNT(*) BY BUCKET(@timestamp, 1h)' };
    activate(registry, [
      recorded('table', { body: table }, 1),
      recorded('histogram', { body: { ...histogram, time_zone: 'UTC' } }, 2),
    ]);

    const otherTz = { time_zone: 'Europe/Vienna' };
    expect((await respond(registry, { ...histogram, ...otherTz })).rawResponse).toEqual({
      id: 'histogram',
    });
    expect((await respond(registry, { ...table, ...otherTz })).rawResponse).toEqual({
      id: 'table',
    });
  });

  it('uses each entry only once and fails a miss without passthrough', async () => {
    const registry = new ReplayRegistry();
    activate(registry, [recorded('hits', hitsParams, 1)]);

    await respond(registry, hitsParams);
    await expect(respond(registry, hitsParams)).rejects.toMatchObject({
      name: NOT_IN_SNAPSHOT_ERROR,
    });
  });

  it('lets a miss go live with passthrough', () => {
    const registry = new ReplayRegistry();
    activate(registry, [recorded('hits', hitsParams, 1)], { passthrough: true });

    expect(registry.match({ params: { query: 'FROM logs' } }, SESSION)).toBeUndefined();
  });

  it('matches ES|QL by kind and stops after dispose', async () => {
    const registry = new ReplayRegistry();
    const esql = { query: 'FROM logs | LIMIT 10' };
    const session = activate(registry, [recorded('esql', { body: esql }, 1, false)]);

    expect(registry.isActive()).toBe(true);
    expect((await respond(registry, esql)).rawResponse).toEqual({ id: 'esql' });
    session.dispose();
    expect(registry.isActive()).toBe(false);
    expect(registry.match({ params: esql }, SESSION)).toBeUndefined();
  });

  it('only replays searches of the added search sessions', async () => {
    const registry = new ReplayRegistry();
    activate(registry, [recorded('hits', hitsParams, 1)]);

    expect(registry.match({ params: hitsParams })).toBeUndefined();
    expect(registry.match({ params: hitsParams }, 'other-session')).toBeUndefined();
    expect((await respond(registry, hitsParams)).rawResponse).toEqual({ id: 'hits' });
  });

  it('keeps concurrent replays separate', async () => {
    const registry = new ReplayRegistry();
    const first = registry.activate([recorded('first', hitsParams, 1)]);
    first.addSessionId('tab-1');
    const second = registry.activate([recorded('second', hitsParams, 1)]);
    second.addSessionId('tab-2');

    expect((await respond(registry, hitsParams, 'tab-1')).rawResponse).toEqual({ id: 'first' });
    expect((await respond(registry, hitsParams, 'tab-2')).rawResponse).toEqual({ id: 'second' });

    second.dispose();
    expect(registry.isActive()).toBe(true);
    expect(registry.match({ params: hitsParams }, 'tab-2')).toBeUndefined();
    first.dispose();
    expect(registry.isActive()).toBe(false);
  });

  it('ignores session ids added after dispose', () => {
    const registry = new ReplayRegistry();
    const session = registry.activate([recorded('hits', hitsParams, 1)]);
    session.dispose();
    session.addSessionId(SESSION);

    expect(registry.match({ params: hitsParams }, SESSION)).toBeUndefined();
  });
});
