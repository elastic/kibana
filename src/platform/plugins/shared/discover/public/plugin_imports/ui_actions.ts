/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import { v4 as uuidv4 } from 'uuid';
import { type EmbeddableApiContext, apiHasAppContext } from '@kbn/presentation-publishing';
import { ADD_PANEL_VISUALIZATION_GROUP } from '@kbn/embeddable-plugin/public';
import type { DiscoverSessionTab } from '@kbn/saved-search-plugin/common';
import type { DiscoverStartPlugins } from '../types';
import type { DiscoverAppLocator } from '../../common';

export function getAddDiscoverByValuePanelAction(
  locator: DiscoverAppLocator,
  discoverServices: DiscoverStartPlugins
) {
  return {
    id: 'addDiscoverByValuePanelAction',
    getIconType: () => 'discoverApp',
    order: 45,
    isCompatible: async () => true,
    execute: async ({ embeddable }: EmbeddableApiContext) => {
      const { app, path } = await locator.getLocation({});
      const stateTransfer = discoverServices.embeddable.getStateTransfer();

      const valueInput: DiscoverSessionTab = {
        id: uuidv4(),
        label: '',
        sort: [],
        columns: [],
        isTextBasedQuery: true,
        grid: {},
        hideChart: false,
        serializedSearchSource: {},
      };

      stateTransfer.navigateToEditor(app, {
        path,
        state: {
          valueInput,
          originatingApp: apiHasAppContext(embeddable)
            ? embeddable.getAppContext().currentAppId
            : '',
          originatingPath: apiHasAppContext(embeddable)
            ? embeddable.getAppContext().getCurrentPath?.()
            : undefined,
        },
      });
    },
    grouping: [ADD_PANEL_VISUALIZATION_GROUP],
    getDisplayName: () =>
      i18n.translate('discover.uiActions.addPanel.displayName', {
        defaultMessage: 'Discover session',
      }),
    getDisplayNameTooltip: () => '',
  };
}
