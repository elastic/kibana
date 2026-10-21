/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import type { CoreStart } from '@kbn/core/public';
import { openLazyFlyout } from '@kbn/presentation-util';
import { getMockPresentationContainer } from '@kbn/presentation-publishing/interfaces/containers/mocks';
import { openVegaEditor } from './open_vega_editor';
import type { VegaEmbeddableApi } from './vega_embeddable';

jest.mock('@kbn/presentation-util', () => ({
  openLazyFlyout: jest.fn(() => ({ onClose: new Promise(() => {}), close: jest.fn() })),
}));

const mockOpenLazyFlyout = jest.mocked(openLazyFlyout);

describe('openVegaEditor', () => {
  beforeEach(() => {
    mockOpenLazyFlyout.mockClear();
  });

  it('opens a flyout that does not close on outside clicks', () => {
    openVegaEditor({
      core: {} as CoreStart,
      focusedPanelId: 'vega-panel',
      loadApi: jest.fn(),
    });

    expect(mockOpenLazyFlyout).toHaveBeenCalledWith(
      expect.objectContaining({
        flyoutProps: expect.objectContaining({
          focusedPanelId: 'vega-panel',
          outsideClickCloses: false,
        }),
      })
    );
  });

  it('removes a new panel when the flyout closes while the editor content is loading', async () => {
    let closeFlyout: () => void = () => {};
    mockOpenLazyFlyout.mockReturnValueOnce({
      onClose: new Promise<void>((resolve) => {
        closeFlyout = resolve;
      }),
      close: jest.fn(),
    });
    let resolveEditPanel: (content: JSX.Element) => void = () => {};
    const api: Pick<VegaEmbeddableApi, 'uuid' | 'getEditPanel'> = {
      uuid: 'vega-panel',
      getEditPanel: jest.fn(
        () =>
          new Promise<JSX.Element>((resolve) => {
            resolveEditPanel = resolve;
          })
      ),
    };
    const parentApi = getMockPresentationContainer();

    openVegaEditor({
      core: {} as CoreStart,
      parentApi,
      loadApi: async () => api as VegaEmbeddableApi,
      isNewPanel: true,
    });
    const { loadContent } = mockOpenLazyFlyout.mock.calls[0][0];
    const content = loadContent({ ariaLabelledBy: 'vegaEditorTitle', closeFlyout: jest.fn() });

    await Promise.resolve();
    expect(api.getEditPanel).toHaveBeenCalled();
    closeFlyout();
    await Promise.resolve();
    const editPanel = <div />;
    resolveEditPanel(editPanel);

    await expect(content).resolves.toBe(editPanel);
    expect(parentApi.removePanel).toHaveBeenCalledWith('vega-panel');
  });

  it('keeps a new panel when the editor content loads while the flyout is open', async () => {
    const editPanel = <div />;
    const api: Pick<VegaEmbeddableApi, 'uuid' | 'getEditPanel'> = {
      uuid: 'vega-panel',
      getEditPanel: jest.fn(async () => editPanel),
    };
    const parentApi = getMockPresentationContainer();

    openVegaEditor({
      core: {} as CoreStart,
      parentApi,
      loadApi: async () => api as VegaEmbeddableApi,
      isNewPanel: true,
    });
    const { loadContent } = mockOpenLazyFlyout.mock.calls[0][0];

    await expect(
      loadContent({ ariaLabelledBy: 'vegaEditorTitle', closeFlyout: jest.fn() })
    ).resolves.toBe(editPanel);
    expect(parentApi.removePanel).not.toHaveBeenCalled();
  });
});
