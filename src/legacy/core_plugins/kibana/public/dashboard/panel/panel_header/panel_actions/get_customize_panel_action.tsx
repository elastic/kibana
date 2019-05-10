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

import { EuiIcon } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { ContextMenuAction, ContextMenuPanel } from 'ui/embeddable';
import { DashboardViewMode } from '../../../dashboard_view_mode';
import { PanelOptionsMenuForm } from '../panel_options_menu_form';

export function getCustomizePanelAction({
  onResetPanelTitle,
  onUpdatePanelTitle,
  closeContextMenu,
  title,
}: {
  onResetPanelTitle: () => void;
  onUpdatePanelTitle: (title: string) => void;
  closeContextMenu: () => void;
  title?: string;
}): ContextMenuAction {
  return new ContextMenuAction(
    {
      id: 'customizePanel',
      parentPanelId: 'mainMenu',
    },
    {
      childContextMenuPanel: new ContextMenuPanel(
        {
          id: 'panelSubOptionsMenu',
          title: i18n.translate('kbn.dashboard.panel.customizePanelTitle', {
            defaultMessage: 'Customize panel',
          }),
        },
        {
          getContent: () => (
            <PanelOptionsMenuForm
              onReset={onResetPanelTitle}
              onUpdatePanelTitle={onUpdatePanelTitle}
              title={title}
              onClose={closeContextMenu}
            />
          ),
        }
      ),
      icon: <EuiIcon type="pencil" />,
      isVisible: ({ containerState }) => containerState.viewMode === DashboardViewMode.EDIT,
      getDisplayName: () => {
        return i18n.translate('kbn.dashboard.panel.customizePanel.displayName', {
          defaultMessage: 'Customize panel',
        });
      },
    }
  );
}
