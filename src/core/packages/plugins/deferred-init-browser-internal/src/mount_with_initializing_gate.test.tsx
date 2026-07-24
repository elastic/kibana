/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { act } from 'react-dom/test-utils';
import { Subject } from 'rxjs';
import type { AppMountParameters } from '@kbn/core-application-browser';
import type { DeferredInitStatus } from '@kbn/core-deferred-init-browser';
import { mountWithInitializingGate } from './mount_with_initializing_gate';

jest.mock('@kbn/core-application-browser', () => ({
  AppInitializingGate: ({
    status,
    pluginId,
    error,
    attempts,
    onRetry,
  }: {
    status: string;
    pluginId: string;
    error?: { message: string };
    attempts?: number;
    onRetry?: () => void;
  }) => (
    <div
      data-test-subj="mock-gate"
      data-status={status}
      data-plugin-id={pluginId}
      data-error={error?.message}
      data-attempts={attempts}
    >
      <button data-test-subj="mock-retry" onClick={onRetry}>
        retry
      </button>
    </div>
  ),
}));

const PLUGIN_ID = 'myPlugin';

describe('mountWithInitializingGate', () => {
  let element: HTMLDivElement;
  let status$: Subject<DeferredInitStatus>;
  let realMount: jest.Mock;
  let realUnmount: jest.Mock;
  let onRetry: jest.Mock;

  const getStartServices = async () =>
    [{ rendering: { addContext: (el: React.ReactElement) => el } }, {}, undefined] as any;

  beforeEach(() => {
    element = document.createElement('div');
    status$ = new Subject();
    realUnmount = jest.fn();
    realMount = jest.fn().mockResolvedValue(realUnmount);
    onRetry = jest.fn();
  });

  const mountGate = async () => {
    const mount = mountWithInitializingGate({
      pluginId: PLUGIN_ID,
      mount: realMount,
      status$,
      onRetry,
      getStartServices,
    });
    let unmount!: () => void;
    await act(async () => {
      unmount = await mount({ element } as unknown as AppMountParameters);
    });
    return unmount;
  };

  it('renders the gate and does not call the real mount while pending', async () => {
    const unmount = await mountGate();

    expect(realMount).not.toHaveBeenCalled();
    const gate = element.querySelector('[data-test-subj="mock-gate"]');
    expect(gate?.getAttribute('data-status')).toBe('idle');
    expect(gate?.getAttribute('data-plugin-id')).toBe(PLUGIN_ID);

    unmount();
  });

  it('mounts the real app once status flips to available and removes the gate', async () => {
    const unmount = await mountGate();

    await act(async () => {
      status$.next({ status: 'available' });
      await Promise.resolve();
    });

    expect(realMount).toHaveBeenCalledTimes(1);
    expect(element.querySelector('[data-test-subj="mock-gate"]')).toBeNull();

    unmount();
    expect(realUnmount).toHaveBeenCalledTimes(1);
  });

  it('passes the error message and attempt count through to the gate', async () => {
    const unmount = await mountGate();

    await act(async () => {
      status$.next({ status: 'failed', error: { message: 'boom' }, attempts: 2 });
    });

    const gate = element.querySelector('[data-test-subj="mock-gate"]');
    expect(gate?.getAttribute('data-status')).toBe('failed');
    expect(gate?.getAttribute('data-error')).toBe('boom');
    expect(gate?.getAttribute('data-attempts')).toBe('2');

    unmount();
  });

  it('wires the gate retry action to the provided onRetry callback', async () => {
    const unmount = await mountGate();

    await act(async () => {
      status$.next({ status: 'failed' });
    });

    const retryButton = element.querySelector('[data-test-subj="mock-retry"]') as HTMLButtonElement;
    act(() => retryButton.click());

    expect(onRetry).toHaveBeenCalledTimes(1);
    unmount();
  });

  it('never calls the real mount if unmounted before status becomes available', async () => {
    const unmount = await mountGate();

    unmount();
    status$.next({ status: 'available' });

    expect(realMount).not.toHaveBeenCalled();
  });

  it('ignores a stray emission after the real app has already mounted', async () => {
    const unmount = await mountGate();

    await act(async () => {
      status$.next({ status: 'available' });
      await Promise.resolve();
    });
    await act(async () => {
      status$.next({ status: 'available' });
      await Promise.resolve();
    });

    expect(realMount).toHaveBeenCalledTimes(1);
    unmount();
  });
});
