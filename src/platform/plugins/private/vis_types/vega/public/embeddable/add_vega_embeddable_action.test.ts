/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License, v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CoreStart } from '@kbn/core/public';
import { openLazySystemFlyout } from '@kbn/presentation-util';
import { VEGA_EMBEDDABLE_TYPE } from '../../common/constants';
import { getDefaultSpec } from '../default_spec';
import { VegaPanelIcon } from '../vega_icon';
import { AddVegaEmbeddableAction } from './add_vega_embeddable_action';

jest.mock('../default_spec', () => ({ getDefaultSpec: () => '{ mark: point }' }));
jest.mock('@kbn/presentation-util', () => ({
  ...jest.requireActual('@kbn/presentation-util'),
  openLazySystemFlyout: jest.fn(() => ({ onClose: new Promise(() => undefined) })),
  tracksOverlays: jest.fn(() => false),
}));

const mockOpenLazySystemFlyout = jest.mocked(openLazySystemFlyout);
const core = {
  notifications: { toasts: { addError: jest.fn() } },
  overlays: {},
} as unknown as CoreStart;
const uiActions = { getAction: jest.fn() };

describe('AddVegaEmbeddableAction', () => {
  it('uses the Vega SVG icon in the add panel menu', () => {
    const action = new AddVegaEmbeddableAction(core, uiActions);

    expect(action.getIconType()).toBe(VegaPanelIcon);
  });

  it('opens the editor flyout before the panel factory resolves', async () => {
    const renderEditor = jest.fn(async (): Promise<null> => null);
    let resolvePanel: (panel: {
      renderEditor: typeof renderEditor;
      uuid: string;
    }) => void = () => {};
    const addNewPanel = jest.fn(
      () =>
        new Promise<{ renderEditor: typeof renderEditor; uuid: string }>((resolve) => {
          resolvePanel = resolve;
        })
    );
    const returnFocus = jest.fn();

    await new AddVegaEmbeddableAction(core, uiActions).execute({
      embeddable: { addNewPanel },
      returnFocus,
    });

    expect(mockOpenLazySystemFlyout).toHaveBeenCalledTimes(1);
    expect(addNewPanel).not.toHaveBeenCalled();
    const {
      flyoutProps,
      loadContent,
      returnFocus: passedFocus,
    } = mockOpenLazySystemFlyout.mock.calls[0][0];
    expect(passedFocus).toBe(returnFocus);
    expect(flyoutProps?.flyoutMenuProps?.trailingActions).toEqual([
      expect.objectContaining({ iconType: 'gear' }),
      expect.objectContaining({ iconType: 'question' }),
    ]);

    const loading = loadContent({ ariaLabelledBy: 'vega-title', closeFlyout: jest.fn() });
    expect(addNewPanel).toHaveBeenCalledWith({
      panelType: VEGA_EMBEDDABLE_TYPE,
      serializedState: { spec: { format: 'hjson', value: getDefaultSpec() } },
    });
    resolvePanel({ renderEditor, uuid: 'new-panel' });
    await loading;
    expect(renderEditor).toHaveBeenCalledWith(
      expect.objectContaining({
        ariaLabelledBy: 'vega-title',
        isNewPanel: true,
        menuManager: expect.objectContaining({ flyoutId: flyoutProps?.id }),
      })
    );
  });
});
