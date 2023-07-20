/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Subscription } from 'rxjs';
import { euiThemeVars } from '@kbn/ui-theme';
import { EuiBadge, EuiNotificationBadge, EuiToolTip } from '@elastic/eui';
import React, { useCallback, useEffect, useMemo, useState } from 'react';

import {
  IEmbeddable,
  panelBadgeTrigger,
  panelNotificationTrigger,
  PANEL_BADGE_TRIGGER,
  PANEL_NOTIFICATION_TRIGGER,
} from '../..';
import { uiActions } from '../../kibana_services';
import {
  EmbeddableBadgeAction,
  EmbeddableNotificationAction,
  EmbeddablePanelProps,
} from '../types';

export const useEmbeddablePanelBadges = (
  showNotifications: boolean,
  showBadges: boolean,
  embeddable: IEmbeddable,
  getActions: EmbeddablePanelProps['getActions']
) => {
  const getActionsForTrigger = getActions ?? uiActions.getTriggerCompatibleActions;

  const [badges, setBadges] = useState<EmbeddableBadgeAction[]>();
  const [notifications, setNotifications] = useState<EmbeddableNotificationAction[]>();

  const getAllBadgesFromEmbeddable = useCallback(async () => {
    if (!showBadges) return;
    let currentBadges: EmbeddableBadgeAction[] =
      ((await getActionsForTrigger(PANEL_BADGE_TRIGGER, {
        embeddable,
      })) as EmbeddableBadgeAction[]) ?? [];

    const { disabledActions } = embeddable.getInput();
    if (disabledActions) {
      currentBadges = currentBadges.filter((badge) => disabledActions.indexOf(badge.id) === -1);
    }
    return currentBadges;
  }, [embeddable, getActionsForTrigger, showBadges]);

  const getAllNotificationsFromEmbeddable = useCallback(async () => {
    if (!showNotifications) return;
    let currentNotifications: EmbeddableNotificationAction[] =
      ((await getActionsForTrigger(PANEL_NOTIFICATION_TRIGGER, {
        embeddable,
      })) as EmbeddableNotificationAction[]) ?? [];

    const { disabledActions } = embeddable.getInput();
    if (disabledActions) {
      currentNotifications = currentNotifications.filter(
        (badge) => disabledActions.indexOf(badge.id) === -1
      );
    }
    return currentNotifications;
  }, [embeddable, getActionsForTrigger, showNotifications]);

  /**
   * On embeddable creation get initial badges & notifications then subscribe to all
   * input updates to refresh them
   */
  useEffect(() => {
    let canceled = false;
    let subscription: Subscription;

    const updateNotificationsAndBadges = async () => {
      const [newBadges, newNotifications] = await Promise.all([
        getAllBadgesFromEmbeddable(),
        getAllNotificationsFromEmbeddable(),
      ]);
      if (canceled) return;
      setBadges(newBadges);
      setNotifications(newNotifications);
    };

    updateNotificationsAndBadges().then(() => {
      if (canceled) return;

      /**
       * since any piece of state could theoretically change which actions are available we need to
       * recalculate them on any input change or any parent input change.
       */
      subscription = embeddable.getInput$().subscribe(() => updateNotificationsAndBadges());
      if (embeddable.parent) {
        subscription.add(
          embeddable.parent.getInput$().subscribe(() => updateNotificationsAndBadges())
        );
      }
    });
    return () => {
      subscription?.unsubscribe();
      canceled = true;
    };
  }, [embeddable, getAllBadgesFromEmbeddable, getAllNotificationsFromEmbeddable]);

  const badgeComponents = useMemo(
    () =>
      badges?.map((badge) => (
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
      )),
    [badges, embeddable]
  );

  const notificationComponents = useMemo(
    () =>
      notifications?.map((notification) => {
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
            style={{ marginTop: euiThemeVars.euiSizeXS, marginRight: euiThemeVars.euiSizeXS }}
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
      }),
    [embeddable, notifications]
  );

  return { badgeComponents, notificationComponents };
};
