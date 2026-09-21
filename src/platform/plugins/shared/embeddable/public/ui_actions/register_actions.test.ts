/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { uiActionsPluginMock } from '@kbn/ui-actions-plugin/public/mocks';
import { EMBEDDABLE_EDITOR_MENU_TRIGGER } from '@kbn/ui-actions-plugin/common/trigger_ids';
import { EDITOR_MENU_EDIT_FILTERS_ACTION } from '../editor_menu/constants';
import { registerActions } from './register_actions';

describe('registerActions', () => {
  it('registers and attaches the edit filters editor action', async () => {
    const uiActions = uiActionsPluginMock.createSetupContract();

    registerActions(uiActions);

    expect(uiActions.registerActionAsync).toHaveBeenCalledWith(
      EDITOR_MENU_EDIT_FILTERS_ACTION,
      expect.any(Function)
    );
    expect(uiActions.attachAction).toHaveBeenCalledWith(
      EMBEDDABLE_EDITOR_MENU_TRIGGER,
      EDITOR_MENU_EDIT_FILTERS_ACTION
    );

    const registration = uiActions.registerActionAsync.mock.calls.find(
      ([actionId]) => actionId === EDITOR_MENU_EDIT_FILTERS_ACTION
    );
    expect(registration).toBeDefined();
    const action = await registration?.[1]();
    expect(action?.id).toBe(EDITOR_MENU_EDIT_FILTERS_ACTION);
  });
});
