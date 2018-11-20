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

import { InjectedIntl, injectI18n } from '@kbn/i18n/react';
import React from 'react';
import { Embeddable } from 'ui/embeddable';
import { PanelId } from '../../selectors';
import { PanelOptionsMenuContainer } from './panel_options_menu_container';

export interface PanelHeaderProps {
  title?: string;
  panelId: PanelId;
  embeddable?: Embeddable;
  isViewOnlyMode: boolean;
  hidePanelTitles: boolean;
}

interface PanelHeaderUiProps extends PanelHeaderProps {
  intl: InjectedIntl;
}

function PanelHeaderUi({
  title,
  panelId,
  embeddable,
  isViewOnlyMode,
  hidePanelTitles,
  intl,
}: PanelHeaderUiProps) {
  if (isViewOnlyMode && (!title || hidePanelTitles)) {
    return (
      <div className="dshPanel__header--floater">
        <div className="dshPanel__headerButtonGroup">
          <PanelOptionsMenuContainer panelId={panelId} embeddable={embeddable} />
        </div>
      </div>
    );
  }

  return (
    <div
      className="dshPanel__header"
      data-test-subj={`dashboardPanelHeading-${(title || '').replace(/\s/g, '')}`}
    >
      <span
        data-test-subj="dashboardPanelTitle"
        className="dshPanel__title"
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
      </span>

      <div className="dshPanel__headerButtonGroup">
        <PanelOptionsMenuContainer panelId={panelId} embeddable={embeddable} />
      </div>
    </div>
  );
}

export const PanelHeader = injectI18n(PanelHeaderUi);
