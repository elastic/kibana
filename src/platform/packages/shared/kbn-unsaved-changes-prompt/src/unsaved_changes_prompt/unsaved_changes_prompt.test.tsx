/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createMemoryHistory } from 'history';

import { renderHook, act, cleanup, waitFor } from '@testing-library/react';

import { coreMock } from '@kbn/core/public/mocks';
import { CoreScopedHistory } from '@kbn/core/public';

import { useUnsavedChangesPrompt } from './unsaved_changes_prompt';

const basePath = '/mock';
const memoryHistory = createMemoryHistory({ initialEntries: [basePath] });
const history = new CoreScopedHistory(memoryHistory, basePath);
const coreStart = coreMock.createStart();
const navigateToUrl = jest.fn().mockImplementation(async (url) => {
  history.push(url);
});

describe('useUnsavedChangesPrompt', () => {
  let addSpy: jest.SpiedFunction<Window['addEventListener']>;
  let removeSpy: jest.SpiedFunction<Window['removeEventListener']>;
  let blockSpy: jest.SpiedFunction<CoreScopedHistory['block']>;

  beforeEach(() => {
    addSpy = jest.spyOn(window, 'addEventListener');
    removeSpy = jest.spyOn(window, 'removeEventListener');
    blockSpy = jest.spyOn(history, 'block');
  });

  afterEach(() => {
    addSpy.mockRestore();
    removeSpy.mockRestore();
    blockSpy.mockRestore();
    jest.resetAllMocks();
  });

  it('should not block if not edited', () => {
    renderHook(() =>
      useUnsavedChangesPrompt({
        hasUnsavedChanges: false,
        http: coreStart.http,
        openConfirm: coreStart.overlays.openConfirm,
        history,
        navigateToUrl,
      })
    );

    act(() => history.push('/test'));

    expect(history.location.pathname).toBe('/test');
    expect(history.location.search).toBe('');
    expect(coreStart.overlays.openConfirm).not.toBeCalled();
    expect(addSpy).not.toBeCalledWith('beforeunload', expect.anything());
  });

  it('should block if edited', async () => {
    coreStart.overlays.openConfirm.mockResolvedValue(true);

    renderHook(() =>
      useUnsavedChangesPrompt({
        hasUnsavedChanges: true,
        http: coreStart.http,
        openConfirm: coreStart.overlays.openConfirm,
        history,
        navigateToUrl,
      })
    );

    act(() => history.push('/test'));

    // needed because we have an async useEffect
    await waitFor(() => new Promise((resolve) => resolve(null)));

    expect(navigateToUrl).toBeCalledWith('/mock/test', expect.anything());
    expect(coreStart.overlays.openConfirm).toBeCalled();
    expect(addSpy).toBeCalledWith('beforeunload', expect.anything());
  });

  it('beforeunload event should be cleaned up', async () => {
    coreStart.overlays.openConfirm.mockResolvedValue(true);

    renderHook(() =>
      useUnsavedChangesPrompt({
        hasUnsavedChanges: true,
        http: coreStart.http,
        openConfirm: coreStart.overlays.openConfirm,
        history,
        navigateToUrl,
      })
    );
    cleanup();
    expect(addSpy).toBeCalledWith('beforeunload', expect.anything());
    expect(removeSpy).toBeCalledWith('beforeunload', expect.anything());
  });

  it('should not block SPA navigation if blockSpaNavigation is false', async () => {
    renderHook(() =>
      useUnsavedChangesPrompt({
        hasUnsavedChanges: true,
        blockSpaNavigation: false,
      })
    );

    expect(addSpy).toBeCalledWith('beforeunload', expect.anything());

    act(() => history.push('/test'));

    expect(coreStart.overlays.openConfirm).not.toBeCalled();

    expect(history.location.pathname).toBe('/test');

    expect(blockSpy).not.toBeCalled();
  });
});
