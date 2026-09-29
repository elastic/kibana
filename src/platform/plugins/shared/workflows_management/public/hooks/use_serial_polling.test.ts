/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { vi } from 'vitest';

import { act, renderHook } from '@testing-library/react';
import { useSerialPolling } from './use_serial_polling';

describe('useSerialPolling', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it('calls poll immediately on mount', async () => {
    const poll = vi.fn().mockResolvedValue(undefined);

    renderHook(() =>
      useSerialPolling({
        poll,
        intervalMs: 1000,
        shouldStop: () => true,
      })
    );

    await act(async () => {
      await Promise.resolve();
    });

    expect(poll).toHaveBeenCalledTimes(1);
  });

  it('calls poll again only after previous finishes and interval elapses', async () => {
    let resolvePoll: (() => void) | undefined;
    const poll = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resolvePoll = resolve;
        })
    );

    renderHook(() =>
      useSerialPolling({
        poll,
        intervalMs: 1000,
        shouldStop: () => poll.mock.calls.length >= 2,
      })
    );

    await act(async () => {
      await Promise.resolve();
    });
    expect(poll).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolvePoll?.();
      await Promise.resolve();
    });

    await act(async () => {
      vi.advanceTimersByTime(999);
      await Promise.resolve();
    });
    expect(poll).toHaveBeenCalledTimes(1);

    await act(async () => {
      vi.advanceTimersByTime(1);
      await Promise.resolve();
    });
    expect(poll).toHaveBeenCalledTimes(2);
  });

  it('does not start a second poll while the first is still in flight', async () => {
    let resolvePoll: (() => void) | undefined;
    const poll = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resolvePoll = resolve;
        })
    );

    renderHook(() =>
      useSerialPolling({
        poll,
        intervalMs: 100,
      })
    );

    await act(async () => {
      await Promise.resolve();
    });
    expect(poll).toHaveBeenCalledTimes(1);

    await act(async () => {
      vi.advanceTimersByTime(500);
      await Promise.resolve();
    });
    expect(poll).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolvePoll?.();
      await Promise.resolve();
    });

    await act(async () => {
      vi.advanceTimersByTime(100);
      await Promise.resolve();
    });
    expect(poll).toHaveBeenCalledTimes(2);
  });

  it('stops polling when shouldStop returns true after a poll', async () => {
    const poll = vi.fn().mockResolvedValue(undefined);
    let stop = false;

    renderHook(() =>
      useSerialPolling({
        poll,
        intervalMs: 1000,
        shouldStop: () => stop,
      })
    );

    await act(async () => {
      await Promise.resolve();
    });
    expect(poll).toHaveBeenCalledTimes(1);

    stop = true;

    await act(async () => {
      vi.advanceTimersByTime(5000);
      await Promise.resolve();
    });
    expect(poll).toHaveBeenCalledTimes(1);
  });

  it('does not poll when enabled is false', async () => {
    const poll = vi.fn().mockResolvedValue(undefined);

    renderHook(() =>
      useSerialPolling({
        poll,
        intervalMs: 1000,
        enabled: false,
      })
    );

    await act(async () => {
      await Promise.resolve();
      vi.advanceTimersByTime(5000);
      await Promise.resolve();
    });

    expect(poll).not.toHaveBeenCalled();
  });

  it('stops polling on unmount', async () => {
    const poll = vi.fn().mockResolvedValue(undefined);

    const { unmount } = renderHook(() =>
      useSerialPolling({
        poll,
        intervalMs: 1000,
      })
    );

    await act(async () => {
      await Promise.resolve();
    });
    expect(poll).toHaveBeenCalledTimes(1);

    unmount();

    await act(async () => {
      vi.advanceTimersByTime(5000);
      await Promise.resolve();
    });
    expect(poll).toHaveBeenCalledTimes(1);
  });

  it('uses dynamic intervalMs from a function', async () => {
    const poll = vi.fn().mockResolvedValue(undefined);
    const getIntervalMs = vi.fn().mockReturnValue(2000);

    renderHook(() =>
      useSerialPolling({
        poll,
        intervalMs: getIntervalMs,
        shouldStop: () => poll.mock.calls.length >= 2,
      })
    );

    await act(async () => {
      await Promise.resolve();
    });
    expect(poll).toHaveBeenCalledTimes(1);

    await act(async () => {
      vi.advanceTimersByTime(1999);
      await Promise.resolve();
    });
    expect(poll).toHaveBeenCalledTimes(1);
    expect(getIntervalMs).toHaveBeenCalledTimes(1);

    await act(async () => {
      vi.advanceTimersByTime(1);
      await Promise.resolve();
    });
    expect(poll).toHaveBeenCalledTimes(2);
  });

  it('does not schedule sleep when immediate is false and shouldStop is already true', async () => {
    const poll = vi.fn().mockResolvedValue(undefined);

    renderHook(() =>
      useSerialPolling({
        poll,
        intervalMs: 1000,
        immediate: false,
        shouldStop: () => true,
      })
    );

    await act(async () => {
      await Promise.resolve();
      vi.advanceTimersByTime(5000);
      await Promise.resolve();
    });

    expect(poll).not.toHaveBeenCalled();
  });

  it('waits one interval before the first poll when immediate is false', async () => {
    const poll = vi.fn().mockResolvedValue(undefined);

    renderHook(() =>
      useSerialPolling({
        poll,
        intervalMs: 1000,
        immediate: false,
        shouldStop: () => poll.mock.calls.length >= 1,
      })
    );

    await act(async () => {
      await Promise.resolve();
    });
    expect(poll).not.toHaveBeenCalled();

    await act(async () => {
      vi.advanceTimersByTime(1000);
      await Promise.resolve();
    });
    expect(poll).toHaveBeenCalledTimes(1);
  });

  it('restarts polling when pollKey changes after the loop had stopped', async () => {
    const poll = vi.fn().mockResolvedValue(undefined);
    let stop = true;

    const { rerender } = renderHook(
      ({ pollKey }: { pollKey: string }) =>
        useSerialPolling({
          poll,
          intervalMs: 1000,
          pollKey,
          shouldStop: () => stop,
        }),
      { initialProps: { pollKey: 'exec-1' } }
    );

    await act(async () => {
      await Promise.resolve();
    });
    expect(poll).toHaveBeenCalledTimes(1);

    await act(async () => {
      vi.advanceTimersByTime(5000);
      await Promise.resolve();
    });
    expect(poll).toHaveBeenCalledTimes(1);

    stop = false;
    await act(async () => {
      rerender({ pollKey: 'exec-2' });
      await Promise.resolve();
    });
    expect(poll).toHaveBeenCalledTimes(2);
  });

  it('continues polling after poll rejects', async () => {
    const poll = vi.fn().mockRejectedValueOnce(new Error('network')).mockResolvedValue(undefined);

    renderHook(() =>
      useSerialPolling({
        poll,
        intervalMs: 500,
        shouldStop: () => poll.mock.calls.length >= 2,
      })
    );

    await act(async () => {
      await Promise.resolve();
    });
    expect(poll).toHaveBeenCalledTimes(1);

    await act(async () => {
      vi.advanceTimersByTime(500);
      await Promise.resolve();
    });
    expect(poll).toHaveBeenCalledTimes(2);
  });
});
