/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { renderHook, waitFor } from '@testing-library/react';
import type { ICPSManager } from '../types';
import { useIsCpsMultiProject } from './use_is_cps_multi_project';

const createCpsManager = (overrides: Partial<ICPSManager> = {}): ICPSManager => ({
  whenReady: jest.fn().mockResolvedValue(undefined),
  fetchProjects: jest.fn().mockResolvedValue(null),
  getTotalProjectCount: jest.fn().mockReturnValue(0),
  hasLinkedProjects: jest.fn().mockReturnValue(false),
  getProjectRouting$: jest.fn(),
  setProjectRouting: jest.fn(),
  getProjectRouting: jest.fn(),
  getDefaultProjectRouting: jest.fn(),
  updateDefaultProjectRouting: jest.fn(),
  getProjectPickerAccess$: jest.fn(),
  registerAppAccess: jest.fn(),
  getConfigurationLinks: jest.fn(),
  ...overrides,
});

describe('useIsCpsMultiProject', () => {
  it('is false when the cps manager is unavailable', () => {
    const { result } = renderHook(() => useIsCpsMultiProject(undefined));

    expect(result.current).toBe(false);
  });

  // Guards the initial state and the effect's no-manager branch against drifting apart: when they
  // disagreed, mounting cost an extra render (re-invoking every other hook in the caller) even
  // though the reported value never actually changes.
  it('does not trigger an extra render when the cps manager is unavailable', () => {
    let renderCount = 0;
    const { result } = renderHook(() => {
      renderCount += 1;
      return useIsCpsMultiProject(undefined);
    });

    expect(result.current).toBe(false);
    expect(renderCount).toBe(1);
  });

  // A synchronous `false` can't be told apart from "not loaded yet", so it has to stay pending
  // until readiness confirms it rather than being seeded like a `true` reading.
  it('stays pending on the first render and settles on false when there is no linked project', async () => {
    const cpsManager = createCpsManager({ hasLinkedProjects: jest.fn().mockReturnValue(false) });

    const { result } = renderHook(() => useIsCpsMultiProject(cpsManager));

    expect(result.current).toBeUndefined();

    await waitFor(() => expect(cpsManager.whenReady).toHaveBeenCalled());
    expect(result.current).toBe(false);
  });

  it('is undefined while readiness is still pending', () => {
    const cpsManager = createCpsManager({
      whenReady: jest.fn().mockReturnValue(new Promise<void>(() => {})),
    });

    const { result } = renderHook(() => useIsCpsMultiProject(cpsManager));

    expect(result.current).toBeUndefined();
  });

  it('is true once readiness resolves and a linked project is present', async () => {
    const cpsManager = createCpsManager({ hasLinkedProjects: jest.fn().mockReturnValue(true) });

    const { result } = renderHook(() => useIsCpsMultiProject(cpsManager));

    await waitFor(() => expect(result.current).toBe(true));
  });

  // Reading `hasLinkedProjects()` before `whenReady()` resolves reports `false` even in a
  // multi-project deployment, which is the mistake this hook exists to prevent.
  it('waits for readiness before reporting a linked project', async () => {
    let isReady = false;
    let markReady = () => {};
    const cpsManager = createCpsManager({
      whenReady: jest.fn().mockReturnValue(
        new Promise<void>((resolve) => {
          markReady = () => {
            isReady = true;
            resolve();
          };
        })
      ),
      hasLinkedProjects: jest.fn(() => isReady),
    });

    const { result } = renderHook(() => useIsCpsMultiProject(cpsManager));

    expect(result.current).toBeUndefined();

    markReady();

    await waitFor(() => expect(result.current).toBe(true));
  });

  // Consumers gate a column or panel on this, so a manager that has already resolved has to
  // answer before paint, otherwise the gated element gets inserted afterwards.
  it('reports an already-ready manager on the first render', async () => {
    const cpsManager = createCpsManager({ hasLinkedProjects: jest.fn().mockReturnValue(true) });

    const { result } = renderHook(() => useIsCpsMultiProject(cpsManager));

    expect(result.current).toBe(true);

    await waitFor(() => expect(cpsManager.whenReady).toHaveBeenCalled());
    expect(result.current).toBe(true);
  });

  it('is false when readiness rejects', async () => {
    const cpsManager = createCpsManager({
      whenReady: jest.fn().mockRejectedValue(new Error('boom')),
      hasLinkedProjects: jest.fn().mockReturnValue(true),
    });

    const { result } = renderHook(() => useIsCpsMultiProject(cpsManager));

    await waitFor(() => expect(cpsManager.whenReady).toHaveBeenCalled());
    expect(result.current).toBe(false);
  });

  it('re-resolves when the cps manager changes', async () => {
    const withoutLinked = createCpsManager({ hasLinkedProjects: jest.fn().mockReturnValue(false) });
    const withLinked = createCpsManager({ hasLinkedProjects: jest.fn().mockReturnValue(true) });

    const { result, rerender } = renderHook(
      ({ cpsManager }: { cpsManager: ICPSManager }) => useIsCpsMultiProject(cpsManager),
      { initialProps: { cpsManager: withoutLinked } }
    );

    await waitFor(() => expect(withoutLinked.whenReady).toHaveBeenCalled());
    expect(result.current).toBe(false);

    rerender({ cpsManager: withLinked });

    await waitFor(() => expect(result.current).toBe(true));
  });
});
