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
import {
  EuiContextMenuPanelDescriptor,
  EuiBadge,
  EuiIcon,
  EuiToolTip,
  EuiScreenReaderOnly,
  EuiNotificationBadge,
} from '@elastic/eui';
import classNames from 'classnames';
import React from 'react';
import { Action } from 'src/plugins/ui_actions/public';
import { PanelOptionsMenu } from './panel_options_menu';
import { IEmbeddable } from '../../embeddables';
import { EmbeddableContext, panelBadgeTrigger, panelNotificationTrigger } from '../../triggers';
import { uiToReactComponent } from '../../../../../kibana_react/public';

export interface PanelHeaderProps {
  title?: string;
  isViewMode: boolean;
  hidePanelTitles: boolean;
  getActionContextMenuPanel: () => Promise<EuiContextMenuPanelDescriptor[]>;
  closeContextMenu: boolean;
  badges: Array<Action<EmbeddableContext>>;
  notifications: Array<Action<EmbeddableContext>>;
  embeddable: IEmbeddable;
  headerId?: string;
  showPlaceholderTitle?: boolean;
}

function renderBadges(badges: Array<Action<EmbeddableContext>>, embeddable: IEmbeddable) {
  return badges.map((badge) => (
    <EuiBadge
      key={badge.id}
      className="embPanel__headerBadge"
      iconType={badge.getIconType({ embeddable, trigger: panelBadgeTrigger })}
      onClick={() => badge.execute({ embeddable, trigger: panelBadgeTrigger })}
      onClickAriaLabel={badge.getDisplayName({ embeddable, trigger: panelBadgeTrigger })}
    >
      {badge.getDisplayName({ embeddable, trigger: panelBadgeTrigger })}
    </EuiBadge>
  ));
}

function renderNotifications(
  notifications: Array<Action<EmbeddableContext>>,
  embeddable: IEmbeddable
) {
  return notifications.map((notification) => {
    const context = { embeddable };

    let badge = notification.MenuItem ? (
      React.createElement(uiToReactComponent(notification.MenuItem))
    ) : (
      <EuiNotificationBadge
        data-test-subj={`embeddablePanelNotification-${notification.id}`}
        key={notification.id}
        style={{ marginTop: '4px', marginRight: '4px' }}
        onClick={() => notification.execute({ ...context, trigger: panelNotificationTrigger })}
      >
        {notification.getDisplayName({ ...context, trigger: panelNotificationTrigger })}
      </EuiNotificationBadge>
    );

    if (notification.getDisplayNameTooltip) {
      const tooltip = notification.getDisplayNameTooltip({
        ...context,
        trigger: panelNotificationTrigger,
      });

      if (tooltip) {
        badge = (
          <EuiToolTip position="top" delay="regular" content={tooltip} key={notification.id}>
            {badge}
          </EuiToolTip>
        );
      }
    }

    return badge;
  });
}

function renderTooltip(description: string) {
  return (
    description !== '' && (
      <EuiToolTip content={description} delay="regular" position="right">
        <EuiIcon type="iInCircle" />
      </EuiToolTip>
    )
  );
}

const VISUALIZE_EMBEDDABLE_TYPE = 'visualization';
type VisualizeEmbeddable = any;

function getViewDescription(embeddable: IEmbeddable | VisualizeEmbeddable) {
  if (embeddable.type === VISUALIZE_EMBEDDABLE_TYPE) {
    const description = embeddable.getVisualizationDescription();

    if (description) {
      return description;
    }
  }

  return '';
}

export function PanelHeader({
  title,
  isViewMode,
  hidePanelTitles,
  getActionContextMenuPanel,
  closeContextMenu,
  badges,
  notifications,
  embeddable,
  headerId,
  showPlaceholderTitle,
}: PanelHeaderProps) {
  const viewDescription = getViewDescription(embeddable);
  const showTitle = !isViewMode || (title && !hidePanelTitles) || viewDescription !== '';
  const showPanelBar = badges.length > 0 || showTitle;
  const classes = classNames('embPanel__header', {
    // eslint-disable-next-line @typescript-eslint/naming-convention
    'embPanel__header--floater': !showPanelBar,
  });
  const placeholderTitle = i18n.translate('embeddableApi.panel.placeholderTitle', {
    defaultMessage: '[No Title]',
  });

  if (!showPanelBar) {
    return (
      <div className={classes}>
        <PanelOptionsMenu
          getActionContextMenuPanel={getActionContextMenuPanel}
          isViewMode={isViewMode}
          closeContextMenu={closeContextMenu}
          title={title}
        />
      </div>
    );
  }

  const titleBlock = (text: string | undefined, className: string, ariaLabel: string) => {
    return (
      <span className="embPanel__titleInner">
        <span className={className} aria-hidden="true">
          {text}
        </span>
        <EuiScreenReaderOnly>
          <span>{ariaLabel}</span>
        </EuiScreenReaderOnly>
        {renderTooltip(viewDescription)}
      </span>
    );
  };

  const getPlaceholderTitle = () => {
    const ariaLabel = i18n.translate('embeddableApi.panel.enhancedDashboardPanelPlaceholderText', {
      defaultMessage: 'Panel with no title',
    });
    return titleBlock(placeholderTitle, 'embPanel__placeholderTitleText', ariaLabel);
  };

  const getTitle = () => {
    const ariaLabel = i18n.translate('embeddableApi.panel.enhancedDashboardPanelAriaLabel', {
      defaultMessage: 'Dashboard panel: {title}',
      values: { title },
    });
    return titleBlock(title, 'embPanel__titleText', ariaLabel);
  };

  return (
    <figcaption
      className={classes}
      data-test-subj={`embeddablePanelHeading-${(title || '').replace(/\s/g, '')}`}
    >
      <h2
        id={headerId}
        data-test-subj="dashboardPanelTitle"
        className="embPanel__title embPanel__dragger"
      >
        {showTitle ? (
          showPlaceholderTitle ? (
            getPlaceholderTitle()
          ) : (
            getTitle()
          )
        ) : (
          <EuiScreenReaderOnly>
            <span>
              {i18n.translate('embeddableApi.panel.dashboardPanelAriaLabel', {
                defaultMessage: 'Dashboard panel',
              })}
            </span>
          </EuiScreenReaderOnly>
        )}
        {renderBadges(badges, embeddable)}
      </h2>
      {renderNotifications(notifications, embeddable)}
      <PanelOptionsMenu
        isViewMode={isViewMode}
        getActionContextMenuPanel={getActionContextMenuPanel}
        closeContextMenu={closeContextMenu}
        title={title}
      />
    </figcaption>
  );
}
