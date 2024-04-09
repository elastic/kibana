/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { apiIsPresentationContainer } from '@kbn/presentation-containers';
import { EmbeddableApiContext } from '@kbn/presentation-publishing';
import { IncompatibleActionError } from '@kbn/ui-actions-plugin/public';
import { openEditorFlyout } from '../editor/open_editor_flyout';
import { APP_ICON, APP_NAME, CONTENT_ID } from '../../common';
import { uiActions } from '../services/kibana_services';

const ADD_LINKS_PANEL_ACTION_ID = 'create_links_panel';

export const registerCreateLinksPanelAction = () => {
  uiActions.registerAction<EmbeddableApiContext>({
    id: ADD_LINKS_PANEL_ACTION_ID,
    getIconType: () => APP_ICON,
    isCompatible: async ({ embeddable }) => {
      return apiIsPresentationContainer(embeddable);
    },
    execute: async ({ embeddable }) => {
      if (!apiIsPresentationContainer(embeddable)) {
        throw new IncompatibleActionError();
      }
      const initialState = await openEditorFlyout({
        parentDashboard: embeddable,
      });

      embeddable.addNewPanel({
        panelType: CONTENT_ID,
        initialState,
      });
    },
    getDisplayName: () => APP_NAME,
  });
  uiActions.attachAction('ADD_PANEL_TRIGGER', ADD_LINKS_PANEL_ACTION_ID);
};
