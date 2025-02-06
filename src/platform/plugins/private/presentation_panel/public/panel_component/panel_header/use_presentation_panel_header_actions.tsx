/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiBadge, EuiNotificationBadge, EuiToolTip, useEuiTheme } from '@elastic/eui';
import React, { useEffect, useMemo, useState } from 'react';
import { Subscription } from 'rxjs';

import { uiActions } from '../../kibana_services';
import {
  PANEL_BADGE_TRIGGER,
  PANEL_NOTIFICATION_TRIGGER,
  panelBadgeTrigger,
  panelNotificationTrigger,
} from '../../panel_actions';
import { AnyApiAction } from '../../panel_actions/types';
import { DefaultPresentationPanelApi, PresentationPanelInternalProps } from '../types';

const disabledNotifications = ['ACTION_FILTERS_NOTIFICATION'];

export const usePresentationPanelHeaderActions = <
  ApiType extends DefaultPresentationPanelApi = DefaultPresentationPanelApi
>(
  showNotifications: boolean,
  showBadges: boolean,
  api: ApiType,
  getActions: PresentationPanelInternalProps['getActions']
) => {
  const [badges, setBadges] = useState<AnyApiAction[]>([]);
  const [notifications, setNotifications] = useState<AnyApiAction[]>([]);

  const { euiTheme } = useEuiTheme();

  /**
   * Get all actions once on mount of the panel. Any actions that are Frequent Compatibility
   * Change Actions need to be subscribed to so they can change over the lifetime of this panel.
   */
  useEffect(() => {
    let canceled = false;
    const subscriptions = new Subscription();
    const getTriggerCompatibleActions = getActions ?? uiActions.getTriggerCompatibleActions;
    const getActionsForTrigger = async (triggerId: string) => {
      let nextActions: AnyApiAction[] =
        ((await getTriggerCompatibleActions(triggerId, {
          embeddable: api,
        })) as AnyApiAction[]) ?? [];

      const disabledActions = (api.disabledActionIds$?.value ?? []).concat(disabledNotifications);
      nextActions = nextActions.filter((badge) => disabledActions.indexOf(badge.id) === -1);
      return nextActions;
    };

    const handleActionCompatibilityChange = (
      type: 'badge' | 'notification',
      isCompatible: boolean,
      action: AnyApiAction
    ) => {
      if (canceled) return;
      (type === 'badge' ? setBadges : setNotifications)((currentActions) => {
        const newActions = currentActions?.filter((current) => current.id !== action.id);
        if (isCompatible) return [...newActions, action];
        return newActions;
      });
    };

    (async () => {
      const [initialBadges, initialNotifications] = await Promise.all([
        getActionsForTrigger(PANEL_BADGE_TRIGGER),
        getActionsForTrigger(PANEL_NOTIFICATION_TRIGGER),
      ]);
      if (canceled) return;
      setBadges(initialBadges);
      setNotifications(initialNotifications);

      const apiContext = { embeddable: api };

      // subscribe to any frequently changing badge actions
      const frequentlyChangingBadges = await uiActions.getFrequentlyChangingActionsForTrigger(
        PANEL_BADGE_TRIGGER,
        apiContext
      );
      if (canceled) return;
      for (const badge of frequentlyChangingBadges) {
        subscriptions.add(
          badge.subscribeToCompatibilityChanges(apiContext, (isCompatible, action) =>
            handleActionCompatibilityChange('badge', isCompatible, action as AnyApiAction)
          )
        );
      }

      // subscribe to any frequently changing notification actions
      const frequentlyChangingNotifications =
        await uiActions.getFrequentlyChangingActionsForTrigger(
          PANEL_NOTIFICATION_TRIGGER,
          apiContext
        );
      if (canceled) return;
      for (const notification of frequentlyChangingNotifications) {
        if (!disabledNotifications.includes(notification.id))
          subscriptions.add(
            notification.subscribeToCompatibilityChanges(apiContext, (isCompatible, action) =>
              handleActionCompatibilityChange('notification', isCompatible, action as AnyApiAction)
            )
          );
      }
    })();

    return () => {
      canceled = true;
      subscriptions.unsubscribe();
    };
    // Disable exhaustive deps because this is meant to be run once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const badgeElements = useMemo(() => {
    if (!showBadges) return [];
    return badges?.map((badge) => {
      const tooltipText = badge.getDisplayNameTooltip?.({
        embeddable: api,
        trigger: panelBadgeTrigger,
      });
      const badgeElement = (
        <EuiBadge
          key={badge.id}
          iconType={badge.getIconType({ embeddable: api, trigger: panelBadgeTrigger })}
          onClick={() => badge.execute({ embeddable: api, trigger: panelBadgeTrigger })}
          onClickAriaLabel={badge.getDisplayName({ embeddable: api, trigger: panelBadgeTrigger })}
          data-test-subj={`embeddablePanelBadge-${badge.id}`}
          {...(tooltipText ? { 'aria-label': tooltipText } : {})}
        >
          {badge.MenuItem
            ? React.createElement(badge.MenuItem, {
                context: {
                  embeddable: api,
                  trigger: panelBadgeTrigger,
                },
              })
            : badge.getDisplayName({ embeddable: api, trigger: panelBadgeTrigger })}
        </EuiBadge>
      );

      return tooltipText ? (
        <EuiToolTip key={badge.id} content={tooltipText}>
          {badgeElement}
        </EuiToolTip>
      ) : (
        badgeElement
      );
    });
  }, [api, badges, showBadges]);

  const notificationElements = useMemo(() => {
    if (!showNotifications) return [];
    return notifications?.map((notification) => {
      let notificationComponent = notification.MenuItem ? (
        React.createElement(notification.MenuItem, {
          key: notification.id,
          context: {
            embeddable: api,
            trigger: panelNotificationTrigger,
          },
        })
      ) : (
        <EuiNotificationBadge
          data-test-subj={`embeddablePanelNotification-${notification.id}`}
          key={notification.id}
          css={{ marginTop: euiTheme.size.xs, marginRight: euiTheme.size.xs }}
          onClick={() =>
            notification.execute({ embeddable: api, trigger: panelNotificationTrigger })
          }
        >
          {notification.getDisplayName({ embeddable: api, trigger: panelNotificationTrigger })}
        </EuiNotificationBadge>
      );

      if (notification.getDisplayNameTooltip) {
        const tooltip = notification.getDisplayNameTooltip({
          embeddable: api,
          trigger: panelNotificationTrigger,
        });

        if (tooltip) {
          notificationComponent = (
            <EuiToolTip position="top" delay="regular" content={tooltip} key={notification.id}>
              {notificationComponent}
            </EuiToolTip>
          );
        }
      }

      return notificationComponent;
    });
  }, [api, euiTheme.size.xs, notifications, showNotifications]);

  return { badgeElements, notificationElements };
};
