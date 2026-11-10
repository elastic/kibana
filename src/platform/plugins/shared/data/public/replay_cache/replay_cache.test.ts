/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ReplayCacheEntry } from './replay_cache';
import { ReplayCache } from './replay_cache';

describe('ReplayCache', () => {
  const lastFetched = '2026-10-31T14:00:00.000Z';
  const entry: ReplayCacheEntry = {
    sessionId: 'session',
    contextKey: 'context',
    timeRange: {
      from: '2026-10-27T09:00:00.000Z',
      to: '2026-10-27T10:00:00.000Z',
      mode: 'absolute',
    },
  };
  const hasSession = jest.fn<boolean, [string]>();
  const hasResponseCacheForSession = jest.fn<boolean, [string]>();
  const evictResponseCacheForSession = jest.fn<void, [string]>();
  let cache: ReplayCache;

  beforeEach(() => {
    jest.useFakeTimers({ now: new Date(lastFetched) });
    hasSession.mockReset().mockReturnValue(true);
    hasResponseCacheForSession.mockReset().mockReturnValue(true);
    evictResponseCacheForSession.mockReset();
    cache = new ReplayCache({
      hasSession,
      hasResponseCacheForSession,
      evictResponseCacheForSession,
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('replays the original session, absolute range and load time for a compatible asset', () => {
    expect(cache.get('asset', 'context')).toEqual({ hit: false });
    cache.set('asset', entry);
    jest.setSystemTime(new Date('2026-10-31T14:30:00.000Z'));

    expect(cache.get('asset', 'context')).toEqual({
      hit: true,
      sessionId: entry.sessionId,
      timeRange: entry.timeRange,
      lastFetched,
    });
    expect(hasSession).toHaveBeenCalledWith(entry.sessionId);
    expect(hasResponseCacheForSession).toHaveBeenCalledWith(entry.sessionId);
    expect(evictResponseCacheForSession).not.toHaveBeenCalled();
  });

  it.each([
    { reason: 'context', contextKey: 'changed', isSessionAvailable: true, hasResponses: true },
    { reason: 'session', contextKey: 'context', isSessionAvailable: false, hasResponses: true },
    { reason: 'responses', contextKey: 'context', isSessionAvailable: true, hasResponses: false },
  ])(
    'returns a miss without eviction when its $reason is unavailable or incompatible',
    ({ contextKey, isSessionAvailable, hasResponses }) => {
      cache.set('asset', entry);
      hasSession.mockReturnValue(isSessionAvailable);
      hasResponseCacheForSession.mockReturnValue(hasResponses);

      expect(cache.get('asset', contextKey)).toEqual({ hit: false });
      expect(evictResponseCacheForSession).not.toHaveBeenCalled();

      hasSession.mockReturnValue(true);
      hasResponseCacheForSession.mockReturnValue(true);
      expect(cache.get('asset', 'context')).toEqual({
        hit: true,
        sessionId: entry.sessionId,
        timeRange: entry.timeRange,
        lastFetched,
      });
    }
  );

  it('evicts the previous session whenever an asset is registered again', () => {
    cache.set('asset', entry);
    expect(evictResponseCacheForSession).not.toHaveBeenCalled();

    cache.set('asset', entry);
    expect(evictResponseCacheForSession).toHaveBeenCalledTimes(1);
    expect(evictResponseCacheForSession).toHaveBeenCalledWith(entry.sessionId);

    const nextLastFetched = '2026-10-31T14:30:00.000Z';
    jest.setSystemTime(new Date(nextLastFetched));
    cache.set('asset', { ...entry, sessionId: 'new-session' });
    expect(evictResponseCacheForSession).toHaveBeenCalledTimes(2);
    expect(evictResponseCacheForSession).toHaveBeenLastCalledWith(entry.sessionId);
    expect(cache.get('asset', 'context')).toMatchObject({
      hit: true,
      sessionId: 'new-session',
      lastFetched: nextLastFetched,
    });
  });

  it('prunes expired sessions on registration without discarding sessions still loading', () => {
    cache.set('expired', { ...entry, sessionId: 'expired-session' });
    cache.set('loading', entry);
    hasSession.mockImplementation((sessionId) => sessionId !== 'expired-session');
    hasResponseCacheForSession.mockReturnValue(false);

    cache.set('new', { ...entry, sessionId: 'new-session' });

    expect(evictResponseCacheForSession).toHaveBeenCalledTimes(1);
    expect(evictResponseCacheForSession).toHaveBeenCalledWith('expired-session');
    hasResponseCacheForSession.mockReturnValue(true);
    expect(cache.get('loading', 'context')).toMatchObject({ hit: true });
    expect(cache.get('expired', 'context')).toEqual({ hit: false });
  });

  it('deletes and clears asset references together with their responses', () => {
    cache.set('first', entry);
    cache.set('second', { ...entry, sessionId: 'second-session' });

    cache.delete('first');
    expect(evictResponseCacheForSession).toHaveBeenCalledWith(entry.sessionId);
    expect(cache.get('first', 'context')).toEqual({ hit: false });
    expect(cache.get('second', 'context')).toMatchObject({ hit: true });

    cache.clear();
    expect(evictResponseCacheForSession).toHaveBeenCalledWith('second-session');
    expect(cache.get('second', 'context')).toEqual({ hit: false });
  });
});
