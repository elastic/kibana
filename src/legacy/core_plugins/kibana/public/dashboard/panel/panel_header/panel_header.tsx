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
import classNames from 'classnames';
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
  const classes = classNames('dshPanel__header', {
    'dshPanel__header--floater': !title || hidePanelTitles,
  });

  if (isViewOnlyMode && (!title || hidePanelTitles)) {
    return (
      <div className={classes}>
        <PanelOptionsMenuContainer panelId={panelId} embeddable={embeddable} />
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
        className="dshPanel__title dshPanel__dragger"
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

      <PanelOptionsMenuContainer panelId={panelId} embeddable={embeddable} />
    </div>
  );
}

export const PanelHeader = injectI18n(PanelHeaderUi);
