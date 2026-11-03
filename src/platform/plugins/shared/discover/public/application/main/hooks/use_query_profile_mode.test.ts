/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { renderHook, act } from '@testing-library/react';
import { RequestAdapter } from '@kbn/inspector-plugin/common';
import type { QueryProfileHeat } from '@kbn/data-plugin/public';
import { useQueryProfileMode } from './use_query_profile_mode';

// One object for every render, as Discover has, since the hook starts over when it changes.
const search = {} as never;

const heat = (query: string): QueryProfileHeat => ({ query, commands: [], profileContext: '' });

const setup = (isOn: boolean) => {
  const requests = new RequestAdapter();
  const loadHeat = jest.fn(async ({ requestJson }: { requestJson: { query?: unknown } }) =>
    heat(String(requestJson.query))
  );
  const setHeat = jest.fn();
  const hook = renderHook(
    (props: { isOn: boolean }) =>
      useQueryProfileMode({
        isOn: props.isOn,
        requests,
        search,
        loadHeat: loadHeat as never,
        setHeat,
      }),
    { initialProps: { isOn } }
  );
  return { requests, loadHeat, setHeat, ...hook };
};

const complete = (requests: RequestAdapter, query: string) =>
  requests.start('Documents').json({ query }).ok({ json: {} });

describe('useQueryProfileMode', () => {
  it('profiles nothing while it is off', async () => {
    const { requests, loadHeat } = setup(false);

    await act(async () => complete(requests, 'FROM logs'));

    expect(loadHeat).not.toHaveBeenCalled();
  });

  it('profiles the request that was already there when it is turned on', async () => {
    const { requests, loadHeat, setHeat, rerender } = setup(false);
    complete(requests, 'FROM logs');

    await act(async () => rerender({ isOn: true }));

    expect(loadHeat).toHaveBeenCalledWith(
      expect.objectContaining({ requestJson: { query: 'FROM logs' } })
    );
    expect(setHeat).toHaveBeenCalledWith(heat('FROM logs'));
  });

  it('profiles each completed run once, ignoring requests still in flight', async () => {
    const { requests, loadHeat } = setup(true);

    const pending = requests.start('Documents').json({ query: 'FROM logs' });
    await act(async () => {});
    expect(loadHeat).not.toHaveBeenCalled();

    await act(async () => pending.ok({ json: {} }));
    expect(loadHeat).toHaveBeenCalledTimes(1);

    await act(async () => complete(requests, 'FROM logs | LIMIT 1'));
    expect(loadHeat).toHaveBeenCalledTimes(2);
    expect(loadHeat).toHaveBeenLastCalledWith(
      expect.objectContaining({ requestJson: { query: 'FROM logs | LIMIT 1' } })
    );
  });

  it('removes what it showed when it is turned off', async () => {
    const { requests, setHeat, rerender } = setup(true);
    await act(async () => complete(requests, 'FROM logs'));
    setHeat.mockClear();

    await act(async () => rerender({ isOn: false }));

    expect(setHeat).toHaveBeenCalledWith(undefined);
  });

  it('shows nothing and does not fail the run when the profile cannot be loaded', async () => {
    const { requests, loadHeat, setHeat } = setup(true);
    loadHeat.mockRejectedValue(new Error('profile failed'));

    await act(async () => complete(requests, 'FROM logs'));

    expect(setHeat).not.toHaveBeenCalledWith(expect.objectContaining({ query: 'FROM logs' }));
  });

  it('ignores requests that are not ES|QL', async () => {
    const { requests, loadHeat } = setup(true);

    await act(async () => requests.start('Documents').json({ size: 10 }).ok({ json: {} }));

    expect(loadHeat).not.toHaveBeenCalled();
  });

  describe('status', () => {
    /** A load that finishes when the test says so. */
    const controlled = () => {
      const pending: Array<{ resolve: () => void; reject: () => void }> = [];
      const loadHeat = jest.fn(
        ({ requestJson }: { requestJson: { query?: unknown } }) =>
          new Promise<QueryProfileHeat>((resolve, reject) => {
            pending.push({
              resolve: () => resolve(heat(String(requestJson.query))),
              reject: () => reject(new Error('profile failed')),
            });
          })
      );
      const requests = new RequestAdapter();
      const setHeat = jest.fn();
      const hook = renderHook(
        (props: { isOn: boolean }) =>
          useQueryProfileMode({
            isOn: props.isOn,
            requests,
            search,
            loadHeat: loadHeat as never,
            setHeat,
          }),
        { initialProps: { isOn: true } }
      );
      return { requests, pending, ...hook };
    };

    it('is idle until a run is being profiled, and again once the profile is in', async () => {
      const { requests, pending, result } = controlled();
      expect(result.current).toBe('idle');

      await act(async () => complete(requests, 'FROM logs'));
      expect(result.current).toBe('profiling');

      await act(async () => pending[0].resolve());
      expect(result.current).toBe('idle');
    });

    it('reports an error when the profile cannot be loaded, and clears it with the next run', async () => {
      const { requests, pending, result } = controlled();

      await act(async () => complete(requests, 'FROM logs'));
      await act(async () => pending[0].reject());
      expect(result.current).toBe('error');

      await act(async () => complete(requests, 'FROM logs | LIMIT 1'));
      expect(result.current).toBe('profiling');
      await act(async () => pending[1].resolve());
      expect(result.current).toBe('idle');
    });

    it('is idle when the mode is off, and does not report an error for a profile it gave up on', async () => {
      const { requests, pending, result, rerender } = controlled();
      await act(async () => complete(requests, 'FROM logs'));
      expect(result.current).toBe('profiling');

      await act(async () => rerender({ isOn: false }));
      expect(result.current).toBe('idle');

      // The load that was abandoned fails afterwards, which says nothing about the next run.
      await act(async () => pending[0].reject());
      expect(result.current).toBe('idle');
    });
  });
});
