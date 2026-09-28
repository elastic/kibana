/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CoreStart } from '@kbn/core/public';
import { openLazySystemFlyout } from '@kbn/presentation-util';
import { openVegaEditor } from './open_vega_editor';

jest.mock('@kbn/presentation-util', () => ({
  openLazySystemFlyout: jest.fn(() => ({ onClose: new Promise(() => {}), close: jest.fn() })),
}));

const mockOpenLazySystemFlyout = jest.mocked(openLazySystemFlyout);

describe('openVegaEditor', () => {
  it('opens a flyout that does not close on outside clicks', () => {
    openVegaEditor({
      core: {} as CoreStart,
      focusedPanelId: 'vega-panel',
      loadApi: jest.fn(),
    });

    expect(mockOpenLazySystemFlyout).toHaveBeenCalledWith(
      expect.objectContaining({
        flyoutProps: expect.objectContaining({
          focusedPanelId: 'vega-panel',
          outsideClickCloses: false,
        }),
      })
    );
  });
});
