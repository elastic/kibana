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
import { i18n } from '@kbn/i18n';
import { EuiContextMenuPanelDescriptor, EuiBadge } from '@elastic/eui';
import classNames from 'classnames';
import React from 'react';
import { PanelOptionsMenu } from './panel_options_menu';
import { Action } from '../../actions';
import { IEmbeddable } from '../../embeddables';

export interface PanelHeaderProps {
  title?: string;
  isViewMode: boolean;
  hidePanelTitles: boolean;
  getActionContextMenuPanel: () => Promise<EuiContextMenuPanelDescriptor>;
  closeContextMenu: boolean;
  badges: Action[];
  embeddable: IEmbeddable;
}

function renderBadges(badges: Action[], embeddable: IEmbeddable) {
  return badges.map(badge => (
    <EuiBadge
      key={badge.id}
      iconType={badge.getIconType({ embeddable })}
      onClick={() => badge.execute({ embeddable })}
      onClickAriaLabel={badge.getDisplayName({ embeddable })}
    >
      {badge.getDisplayName({ embeddable })}
    </EuiBadge>
  ));
}

export function PanelHeader({
  title,
  isViewMode,
  hidePanelTitles,
  getActionContextMenuPanel,
  closeContextMenu,
  badges,
  embeddable,
}: PanelHeaderProps) {
  const classes = classNames('embPanel__header', {
    'embPanel__header--floater': !title || hidePanelTitles,
  });

  const showTitle = !isViewMode || (title && !hidePanelTitles);
  const showPanelBar = badges.length > 0 || showTitle;

  if (!showPanelBar) {
    return (
      <div className={classes}>
        <PanelOptionsMenu
          getActionContextMenuPanel={getActionContextMenuPanel}
          isViewMode={isViewMode}
          closeContextMenu={closeContextMenu}
        />
      </div>
    );
  }

  return (
    <div
      className={classes}
      data-test-subj={`embeddablePanelHeading-${(title || '').replace(/\s/g, '')}`}
    >
      <div
        data-test-subj="dashboardPanelTitle"
        className="embPanel__title embPanel__dragger"
        title={title}
        aria-label={i18n.translate('embeddableApi.panel.dashboardPanelAriaLabel', {
          defaultMessage: 'Dashboard panel: {title}',
          values: {
            title,
          },
        })}
      >
        {showTitle ? `${title} ` : ''}
        {renderBadges(badges, embeddable)}
      </div>

      <PanelOptionsMenu
        isViewMode={isViewMode}
        getActionContextMenuPanel={getActionContextMenuPanel}
        closeContextMenu={closeContextMenu}
      />
    </div>
  );
}
