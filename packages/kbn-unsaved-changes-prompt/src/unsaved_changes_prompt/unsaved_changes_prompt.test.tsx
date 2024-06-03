/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { createMemoryHistory } from 'history';
import { renderHook, act } from '@testing-library/react-hooks';

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
    await act(() => new Promise((resolve) => resolve()));

    expect(navigateToUrl).toBeCalledWith('/mock/test', expect.anything());
    expect(coreStart.overlays.openConfirm).toBeCalled();
  });
});
