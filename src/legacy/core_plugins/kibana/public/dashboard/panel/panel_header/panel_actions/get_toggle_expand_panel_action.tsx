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

import { ContextMenuAction } from 'ui/embeddable';

/**
 * Returns an action that toggles the panel into maximized or minimized state.
 * @param {boolean} isExpanded
 * @param {function} toggleExpandedPanel
 * @return {ContextMenuAction}
 */
export function getToggleExpandPanelAction({
  isExpanded,
  toggleExpandedPanel,
}: {
  isExpanded: boolean;
  toggleExpandedPanel: () => void;
}) {
  return new ContextMenuAction(
    {
      id: 'togglePanel',
      parentPanelId: 'mainMenu',
    },
    {
      getDisplayName: () => {
        return isExpanded
          ? i18n.translate('kbn.dashboard.panel.toggleExpandPanel.expandedDisplayName', {
              defaultMessage: 'Minimize',
            })
          : i18n.translate('kbn.dashboard.panel.toggleExpandPanel.notExpandedDisplayName', {
              defaultMessage: 'Full screen',
            });
      },
      // TODO: Update to minimize icon when https://github.com/elastic/eui/issues/837 is complete.
      icon: <EuiIcon type={isExpanded ? 'expand' : 'expand'} />,
      onClick: toggleExpandedPanel,
    }
  );
}
