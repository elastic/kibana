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

import { EuiContextMenuPanelDescriptor } from '@elastic/eui';
import { InjectedIntl, injectI18n } from '@kbn/i18n/react';
import classNames from 'classnames';
import React from 'react';
import { PanelOptionsMenu } from './panel_options_menu';

export interface PanelHeaderProps {
  title?: string;
  isViewMode: boolean;
  hidePanelTitles: boolean;
  getPanels: () => Promise<EuiContextMenuPanelDescriptor[]>;
  closeContextMenu: boolean;
}

interface PanelHeaderUiProps extends PanelHeaderProps {
  intl: InjectedIntl;
}

function PanelHeaderUi({
  title,
  isViewMode,
  hidePanelTitles,
  getPanels,
  intl,
  closeContextMenu,
}: PanelHeaderUiProps) {
  const classes = classNames('embPanel__header', {
    'embPanel__header--floater': !title || hidePanelTitles,
  });

  if (isViewMode && (!title || hidePanelTitles)) {
    return (
      <div className={classes}>
        <PanelOptionsMenu
          getPanels={getPanels}
          isViewMode={isViewMode}
          closeContextMenu={closeContextMenu}
        />
      </div>
    );
  }

  return (
    <div
      className={classes}
      data-test-subj={`dashboardPanelHeading-${(title || '').replace(/\s/g, '')}`}
    >
      <div
        data-test-subj="dashboardPanelTitle"
        className="embPanel__title embPanel__dragger"
        title={title}
        aria-label={intl.formatMessage(
          {
            id: 'kbn.dashboard.panel.dashboardPanelAriaLabel',
            defaultMessage: 'Dashboard panel: {title}',
          },
          {
            title,
          }
        )}
      >
        {hidePanelTitles ? '' : title}
      </div>

      <PanelOptionsMenu
        isViewMode={isViewMode}
        getPanels={getPanels}
        closeContextMenu={closeContextMenu}
      />
    </div>
  );
}

export const PanelHeader = injectI18n(PanelHeaderUi);
