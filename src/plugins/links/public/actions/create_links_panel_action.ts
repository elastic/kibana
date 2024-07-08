/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { apiIsPresentationContainer } from '@kbn/presentation-containers';
import { EmbeddableApiContext } from '@kbn/presentation-publishing';
import { ADD_PANEL_TRIGGER, IncompatibleActionError } from '@kbn/ui-actions-plugin/public';
import { COMMON_EMBEDDABLE_GROUPING } from '@kbn/embeddable-plugin/public';
import { APP_ICON, APP_NAME, CONTENT_ID } from '../../common';
import { uiActions } from '../services/kibana_services';
import { serializeLinksAttributes } from '../lib/serialize_attributes';
import { LinksSerializedState } from '../types';

const ADD_LINKS_PANEL_ACTION_ID = 'create_links_panel';

export const registerCreateLinksPanelAction = () => {
  uiActions.registerAction<EmbeddableApiContext>({
    id: ADD_LINKS_PANEL_ACTION_ID,
    getIconType: () => APP_ICON,
    order: 10,
    isCompatible: async ({ embeddable }) => {
      return apiIsPresentationContainer(embeddable);
    },
    execute: async ({ embeddable }) => {
      if (!apiIsPresentationContainer(embeddable)) {
        throw new IncompatibleActionError();
      }
      const { openEditorFlyout } = await import('../editor/open_editor_flyout');
      const runtimeState = await openEditorFlyout({
        parentDashboard: embeddable,
      });
      if (!runtimeState) return;

      const initialState: LinksSerializedState = runtimeState.savedObjectId
        ? { savedObjectId: runtimeState.savedObjectId }
        : // We should not extract the references when passing initialState to addNewPanel
          serializeLinksAttributes(runtimeState, false);

      await embeddable.addNewPanel({
        panelType: CONTENT_ID,
        initialState,
      });
    },
    grouping: [COMMON_EMBEDDABLE_GROUPING.annotation],
    getDisplayName: () => APP_NAME,
  });
  uiActions.attachAction(ADD_PANEL_TRIGGER, ADD_LINKS_PANEL_ACTION_ID);
};
