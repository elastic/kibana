/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import React from 'react';

import {
  EuiIcon,
} from '@elastic/eui';

import { Inspector } from 'ui/inspector';
import { DashboardPanelAction } from 'ui/dashboard_panel_actions';

/**
 * Returns the dashboard panel action for opening an inspector for a specific panel.
 * This will check if the embeddable inside the panel actually exposes inspector adapters
 * via its embeddable.getInspectorAdapters() method. If so - and if an inspector
 * could be shown for those adapters - the inspector icon will be visible.
 * @return {DashboardPanelAction}
 */
export function getInspectorPanelAction({ closeContextMenu, panelTitle }) {
  return new DashboardPanelAction(
    {
      id: 'openInspector',
      displayName: 'Inspector',
      parentPanelId: 'mainMenu',
    },
    {
      icon: <EuiIcon type="inspect" />,
      onClick: ({ embeddable }) => {
        closeContextMenu();
        const session = Inspector.open(embeddable.getInspectorAdapters(), {
          title: panelTitle,
        });
        // Overwrite the embeddables.destroy() function to close the inspector
        // before calling the original destroy method
        const originalDestroy = embeddable.destroy;
        embeddable.destroy = () => {
          session.close();
          if (originalDestroy) {
            originalDestroy.call(embeddable);
          }
        };
        // In case the inspector gets closed (otherwise), restore the original destroy function
        session.on('closed', () => {
          embeddable.destroy = originalDestroy;
        });
      },
      isVisible: ({ embeddable }) => (
        embeddable && Inspector.isAvailable(embeddable.getInspectorAdapters())
      ),
    });
}
