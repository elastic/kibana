/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiBadge, EuiNotificationBadge, EuiToolTip } from '@elastic/eui';
import { euiThemeVars } from '@kbn/ui-theme';
import React, { useEffect, useMemo, useState } from 'react';
import { Subscription } from 'rxjs';

import { uiActions } from '../../kibana_services';
import {
  panelBadgeTrigger,
  panelNotificationTrigger,
  PANEL_BADGE_TRIGGER,
  PANEL_NOTIFICATION_TRIGGER,
} from '../../panel_actions';
import { AnyApiAction } from '../../panel_actions/types';
import { DefaultPresentationPanelApi, PresentationPanelInternalProps } from '../types';

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

      const disabledActions = api.disabledActionIds?.value;
      if (disabledActions) {
        nextActions = nextActions.filter((badge) => disabledActions.indexOf(badge.id) === -1);
      }
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
      const frequentlyChangingBadges = uiActions.getFrequentlyChangingActionsForTrigger(
        PANEL_BADGE_TRIGGER,
        apiContext
      );
      for (const badge of frequentlyChangingBadges) {
        subscriptions.add(
          badge.subscribeToCompatibilityChanges(apiContext, (isComptaible, action) =>
            handleActionCompatibilityChange('badge', isComptaible, action as AnyApiAction)
          )
        );
      }

      // subscribe to any frequently changing notification actions
      const frequentlyChangingNotifications = uiActions.getFrequentlyChangingActionsForTrigger(
        PANEL_NOTIFICATION_TRIGGER,
        apiContext
      );
      for (const notification of frequentlyChangingNotifications) {
        subscriptions.add(
          notification.subscribeToCompatibilityChanges(apiContext, (isComptaible, action) =>
            handleActionCompatibilityChange('notification', isComptaible, action as AnyApiAction)
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
          className="embPanel__headerBadge"
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
        <EuiToolTip content={tooltipText}>{badgeElement}</EuiToolTip>
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
          style={{ marginTop: euiThemeVars.euiSizeXS, marginRight: euiThemeVars.euiSizeXS }}
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
  }, [api, notifications, showNotifications]);

  return { badgeElements, notificationElements };
};
