/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import {
  EuiContextMenuPanelDescriptor,
  EuiBadge,
  EuiIcon,
  EuiToolTip,
  EuiScreenReaderOnly,
  EuiNotificationBadge,
  EuiLink,
} from '@elastic/eui';
import classNames from 'classnames';
import React from 'react';
import { Action } from '@kbn/ui-actions-plugin/public';
import { PanelOptionsMenu } from './panel_options_menu';
import { IEmbeddable } from '../../embeddables';
import { EmbeddableContext, panelBadgeTrigger, panelNotificationTrigger } from '../../triggers';
import { CustomizePanelAction } from '.';

export interface PanelHeaderProps {
  title?: string;
  description?: string;
  index?: number;
  isViewMode: boolean;
  hidePanelTitle: boolean;
  getActionContextMenuPanel: () => Promise<{
    panels: EuiContextMenuPanelDescriptor[];
    actions: Action[];
  }>;
  closeContextMenu: boolean;
  badges: Array<Action<EmbeddableContext>>;
  notifications: Array<Action<EmbeddableContext>>;
  embeddable: IEmbeddable;
  headerId?: string;
  showPlaceholderTitle?: boolean;
  customizePanel?: CustomizePanelAction;
}

function renderBadges(badges: Array<Action<EmbeddableContext>>, embeddable: IEmbeddable) {
  return badges.map((badge) => (
    <EuiBadge
      key={badge.id}
      className="embPanel__headerBadge"
      iconType={badge.getIconType({ embeddable, trigger: panelBadgeTrigger })}
      onClick={() => badge.execute({ embeddable, trigger: panelBadgeTrigger })}
      onClickAriaLabel={badge.getDisplayName({ embeddable, trigger: panelBadgeTrigger })}
      data-test-subj={`embeddablePanelBadge-${badge.id}`}
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
      React.createElement(notification.MenuItem, {
        key: notification.id,
        context: {
          embeddable,
          trigger: panelNotificationTrigger,
        },
      })
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

export function PanelHeader({
  title,
  description,
  index,
  isViewMode,
  hidePanelTitle,
  getActionContextMenuPanel,
  closeContextMenu,
  badges,
  notifications,
  embeddable,
  headerId,
  customizePanel,
}: PanelHeaderProps) {
  const showTitle = !hidePanelTitle && (!isViewMode || title);
  const showPanelBar =
    !isViewMode || badges.length > 0 || notifications.length > 0 || showTitle || description;
  const classes = classNames('embPanel__header', {
    'embPanel__header--floater': !showPanelBar,
  });
  const placeholderTitle = i18n.translate('embeddableApi.panel.placeholderTitle', {
    defaultMessage: '[No Title]',
  });

  const getAriaLabel = () => {
    return (
      <span id={headerId}>
        {showPanelBar && title
          ? i18n.translate('embeddableApi.panel.enhancedDashboardPanelAriaLabel', {
              defaultMessage: 'Dashboard panel: {title}',
              values: { title: title || placeholderTitle },
            })
          : i18n.translate('embeddableApi.panel.dashboardPanelAriaLabel', {
              defaultMessage: 'Dashboard panel',
            })}
      </span>
    );
  };

  if (!showPanelBar) {
    return (
      <div className={classes}>
        <PanelOptionsMenu
          getActionContextMenuPanel={getActionContextMenuPanel}
          isViewMode={isViewMode}
          closeContextMenu={closeContextMenu}
          title={title}
          index={index}
        />
        <EuiScreenReaderOnly>{getAriaLabel()}</EuiScreenReaderOnly>
      </div>
    );
  }

  const renderTitle = () => {
    let titleComponent;
    if (showTitle) {
      titleComponent = isViewMode ? (
        <span
          className={classNames('embPanel__titleText', {
            // eslint-disable-next-line @typescript-eslint/naming-convention
            embPanel__placeholderTitleText: !title,
          })}
        >
          {title || placeholderTitle}
        </span>
      ) : customizePanel ? (
        <EuiLink
          color="text"
          data-test-subj={'embeddablePanelTitleLink'}
          className={classNames('embPanel__titleText', {
            // eslint-disable-next-line @typescript-eslint/naming-convention
            embPanel__placeholderTitleText: !title,
          })}
          aria-label={i18n.translate('embeddableApi.panel.editTitleAriaLabel', {
            defaultMessage: 'Click to edit title: {title}',
            values: { title: title || placeholderTitle },
          })}
          onClick={() => customizePanel.execute({ embeddable })}
        >
          {title || placeholderTitle}
        </EuiLink>
      ) : null;
    }
    return description ? (
      <EuiToolTip
        content={description}
        delay="regular"
        position="top"
        anchorClassName="embPanel__titleTooltipAnchor"
      >
        <span className="embPanel__titleInner">
          {titleComponent} <EuiIcon type="iInCircle" color="subdued" />
        </span>
      </EuiToolTip>
    ) : (
      <span className="embPanel__titleInner">{titleComponent}</span>
    );
  };

  const titleClasses = classNames('embPanel__title', { 'embPanel--dragHandle': !isViewMode });

  return (
    <figcaption
      className={classes}
      data-test-subj={`embeddablePanelHeading-${(title || '').replace(/\s/g, '')}`}
    >
      <h2 data-test-subj="dashboardPanelTitle" className={titleClasses}>
        <EuiScreenReaderOnly>{getAriaLabel()}</EuiScreenReaderOnly>
        {renderTitle()}
        {renderBadges(badges, embeddable)}
      </h2>
      {renderNotifications(notifications, embeddable)}
      <PanelOptionsMenu
        isViewMode={isViewMode}
        getActionContextMenuPanel={getActionContextMenuPanel}
        closeContextMenu={closeContextMenu}
        title={title}
        index={index}
      />
    </figcaption>
  );
}
