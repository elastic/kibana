/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { createMemoryHistory } from 'history';
import { act } from '@testing-library/react-hooks';

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

const createTestRendererMock = () => {
  // TODO...
};

// our test mountHistory prepends the basePath to URLs, however useHistory state doesnt have the basePath
// in production, so we have to prepend it to the state.pathname, this results in /mock/mock in the assertions
describe.skip('useUnsavedChangesPrompt', () => {
  it('should not block if not edited', () => {
    const renderer = createTestRendererMock();

    renderer.renderHook(() =>
      useUnsavedChangesPrompt({
        hasUnsavedChanges: false,
        http: coreStart.http,
        openConfirm: coreStart.overlays.openConfirm,
        history,
        navigateToUrl,
      })
    );

    act(() => renderer.mountHistory.push('/test'));

    const { location } = renderer.mountHistory;
    expect(location.pathname).toBe('/test');
    expect(location.search).toBe('');
    expect(renderer.startServices.overlays.openConfirm).not.toBeCalled();
  });

  it('should block if edited', async () => {
    const renderer = createTestRendererMock();

    renderer.startServices.overlays.openConfirm.mockResolvedValue(true);
    renderer.renderHook(() =>
      useUnsavedChangesPrompt({
        hasUnsavedChanges: true,
        http: coreStart.http,
        openConfirm: coreStart.overlays.openConfirm,
        history,
        navigateToUrl,
      })
    );

    act(() => renderer.mountHistory.push('/test'));
    // needed because we have an async useEffect
    await act(() => new Promise((resolve) => resolve()));

    expect(renderer.startServices.overlays.openConfirm).toBeCalled();
    expect(renderer.startServices.application.navigateToUrl).toBeCalledWith(
      '/mock/mock/test',
      expect.anything()
    );
  });

  it('should block if edited and not navigate on cancel', async () => {
    const renderer = createTestRendererMock();

    renderer.startServices.overlays.openConfirm.mockResolvedValue(false);
    renderer.renderHook(() =>
      useUnsavedChangesPrompt({
        hasUnsavedChanges: true,
        http: coreStart.http,
        openConfirm: coreStart.overlays.openConfirm,
        history,
        navigateToUrl,
      })
    );

    act(() => renderer.mountHistory.push('/test'));
    // needed because we have an async useEffect
    await act(() => new Promise((resolve) => resolve()));

    expect(renderer.startServices.overlays.openConfirm).toBeCalled();
    expect(renderer.startServices.application.navigateToUrl).not.toBeCalled();
  });
});
