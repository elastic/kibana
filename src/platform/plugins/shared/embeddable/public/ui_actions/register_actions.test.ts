/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { uiActionsPluginMock } from '@kbn/ui-actions-plugin/public/mocks';
import { ACTION_REMOVE_PANEL } from './remove_panel_action/constants';
import { registerActions } from './register_actions';

describe('registerActions', () => {
  it('does not register an edit-filters action', () => {
    const uiActions = uiActionsPluginMock.createSetupContract();

    registerActions(uiActions);

    expect(uiActions.registerActionAsync).not.toHaveBeenCalledWith(
      'EDITOR_MENU_EDIT_FILTERS_ACTION',
      expect.any(Function)
    );
    expect(uiActions.registerActionAsync).toHaveBeenCalledWith(
      ACTION_REMOVE_PANEL,
      expect.any(Function)
    );
  });
});
