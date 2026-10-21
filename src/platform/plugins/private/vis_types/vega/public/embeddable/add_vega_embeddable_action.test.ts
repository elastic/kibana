/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CoreStart } from '@kbn/core/public';
import { ADD_CANVAS_ELEMENT_TRIGGER } from '@kbn/ui-actions-plugin/common/trigger_ids';
import { VEGA_EMBEDDABLE_TYPE } from '../../common/constants';
import { getDefaultSpec } from '../default_spec';
import { VegaPanelIcon } from '../vega_icon';
import { getAddVegaEmbeddableAction } from './add_vega_embeddable_action';
import { openVegaEditor } from './open_vega_editor';

jest.mock('../default_spec', () => ({ getDefaultSpec: () => '{ mark: point }' }));
jest.mock('./open_vega_editor', () => ({
  openVegaEditor: jest.fn(),
}));

const mockOpenVegaEditor = jest.mocked(openVegaEditor);
const core = {
  notifications: { toasts: { addError: jest.fn() } },
  overlays: {},
} as unknown as CoreStart;

describe('getAddVegaEmbeddableAction', () => {
  beforeEach(() => {
    mockOpenVegaEditor.mockClear();
  });

  it('uses the Vega SVG icon in the add panel menu', () => {
    const action = getAddVegaEmbeddableAction(core);

    expect(action.getIconType({} as never)).toBe(VegaPanelIcon);
  });

  it('uses a named EUI icon in the Canvas add menu', () => {
    const action = getAddVegaEmbeddableAction(core);

    expect(
      action.getIconType({ embeddable: {}, trigger: { id: ADD_CANVAS_ELEMENT_TRIGGER } } as never)
    ).toBe('code');
  });

  it('opens the shared Vega editor for a newly created panel', async () => {
    const action = getAddVegaEmbeddableAction(core);
    let resolvePanel: (panel: { getEditPanel: jest.Mock; uuid: string }) => void = () => {};
    const addNewPanel = jest.fn(
      () =>
        new Promise<{ getEditPanel: jest.Mock; uuid: string }>((resolve) => {
          resolvePanel = resolve;
        })
    );
    const returnFocus = jest.fn();

    await action.execute({
      embeddable: { addNewPanel },
      returnFocus,
    });

    expect(mockOpenVegaEditor).toHaveBeenCalledWith(
      expect.objectContaining({
        core,
        parentApi: { addNewPanel },
        returnFocus,
        isNewPanel: true,
      })
    );

    const { loadApi, focusedPanelId } = mockOpenVegaEditor.mock.calls[0][0];
    const loading = loadApi();

    expect(focusedPanelId).toEqual(expect.any(String));
    expect(addNewPanel).toHaveBeenCalledWith({
      maybePanelId: focusedPanelId,
      panelType: VEGA_EMBEDDABLE_TYPE,
      serializedState: { spec: { format: 'hjson', value: getDefaultSpec() } },
    });

    const panel = { getEditPanel: jest.fn(), uuid: 'new-panel' };
    resolvePanel(panel);

    await expect(loading).resolves.toBe(panel);
  });

  it('adds a default panel without opening the editor when the parent disables inline editing', async () => {
    const action = getAddVegaEmbeddableAction(core);
    const addNewPanel = jest.fn().mockResolvedValue(undefined);

    await action.execute({
      embeddable: { addNewPanel, canEditInline: false },
      returnFocus: jest.fn(),
    });

    expect(mockOpenVegaEditor).not.toHaveBeenCalled();
    expect(addNewPanel).toHaveBeenCalledTimes(1);
    expect(addNewPanel).toHaveBeenCalledWith({
      maybePanelId: expect.any(String),
      panelType: VEGA_EMBEDDABLE_TYPE,
      serializedState: { spec: { format: 'hjson', value: getDefaultSpec() } },
    });
  });
});
