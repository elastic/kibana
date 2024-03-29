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
import { APP_ICON, APP_NAME } from '../../common';
import { uiActions } from '../services/kibana_services';
import { LinksInput } from '../embeddable/types';
import { LINKS_VERTICAL_LAYOUT } from '../../common/content_management';

const ADD_LINKS_PANEL_ACTION_ID = 'create_links_panel';

const getDefaultLinksConfig = (): LinksInput => ({
  id: '',
  attributes: {
    title: '',
    links: [],
    layout: LINKS_VERTICAL_LAYOUT,
  },
  // TODO: Replace string 'OPEN_FLYOUT_ADD_DRILLDOWN' with constant once the dashboardEnhanced plugin is removed
  // and it is no longer locked behind `x-pack`
  disabledActions: ['OPEN_FLYOUT_ADD_DRILLDOWN'],
});

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
      const linksConfig = await openEditorFlyout(getDefaultLinksConfig());

      embeddable.addNewPanel({
        panelType: 'links',
        initialState: linksConfig,
      });
    },
    getDisplayName: () => APP_NAME,
  });
  uiActions.attachAction('ADD_PANEL_TRIGGER', ADD_LINKS_PANEL_ACTION_ID);
};
