/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createKibanaReactContext } from '@kbn/kibana-react-plugin/public';
import { openLazyFlyout } from '@kbn/presentation-util';
import React from 'react';
import { apiHasUniqueId } from '@kbn/presentation-publishing';
import { core } from '../../kibana_services';
import { CustomizePanelActionApi } from './customize_panel_action';

export function openCustomizePanelFlyout({
  focusOnTitle,
  api,
}: {
  focusOnTitle?: boolean;
  api: CustomizePanelActionApi;
}) {
  openLazyFlyout({
    core,
    parentApi: api.parentApi,
    loadContent: async ({ closeFlyout, ariaLabelledBy }) => {
      const { CustomizePanelEditor } = await import('./customize_panel_editor');
      const { Provider: KibanaReactContextProvider } = createKibanaReactContext({
        uiSettings: core.uiSettings,
      });
      return (
        <KibanaReactContextProvider>
          <CustomizePanelEditor
            focusOnTitle={focusOnTitle}
            api={api}
            onClose={closeFlyout}
            ariaLabelledBy={ariaLabelledBy}
          />
        </KibanaReactContextProvider>
      );
    },
    flyoutProps: {
      'data-test-subj': 'customizePanel',
    },
    uuid: apiHasUniqueId(api) ? api.uuid : undefined,
  });
}
