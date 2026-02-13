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
import { Subscription, switchMap } from 'rxjs';

import { i18n } from '@kbn/i18n';
import { uiActions } from '../../kibana_services';
import { PANEL_NOTIFICATION_TRIGGER, panelNotificationTrigger } from '../../panel_actions';
import type { AnyApiAction } from '../../panel_actions/types';
import type { DefaultPresentationPanelApi, PresentationPanelInternalProps } from '../types';

const disabledNotifications = ['ACTION_FILTERS_NOTIFICATION'];

export const usePresentationPanelHeaderActions = <
  ApiType extends DefaultPresentationPanelApi = DefaultPresentationPanelApi
>(
  showNotifications: boolean,
  showBadges: boolean,
  api: ApiType,
  getActions: PresentationPanelInternalProps['getActions']
) => {
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
      if (type === 'badge') console.log(type, isCompatible, action);
      if (canceled) return;
      setNotifications((currentActions) => {
        const newActions = currentActions?.filter((current) => current.id !== action.id);
        if (isCompatible) return [...newActions, action];
        return newActions;
      });
    };

    (async () => {
      const [initialNotifications] = await Promise.all([
        getActionsForTrigger(PANEL_NOTIFICATION_TRIGGER),
      ]);
      if (canceled) return;
      setNotifications(initialNotifications);

      const apiContext = { embeddable: api };

      // subscribe to any frequently changing notification actions
      const frequentlyChangingNotifications =
        await uiActions.getFrequentlyChangingActionsForTrigger(
          PANEL_NOTIFICATION_TRIGGER,
          apiContext
        );
      if (canceled) return;
      for (const notification of frequentlyChangingNotifications) {
        if (!disabledNotifications.includes(notification.id)) {
          const compatibilitySubject = notification
            .getCompatibilityChangesSubject(apiContext)
            ?.pipe(
              switchMap(async () => {
                return await notification.isCompatible({
                  ...apiContext,
                  trigger: panelNotificationTrigger,
                });
              })
            )
            .subscribe(async (isCompatible) => {
              handleActionCompatibilityChange(
                'notification',
                isCompatible,
                notification as AnyApiAction
              );
            });
          subscriptions.add(compatibilitySubject);
        }
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
    const tooltipText = i18n.translate(
      'inputControl.deprecationBadgeAction.deprecationWarningDescription',
      {
        defaultMessage:
          'Input controls are deprecated and will be removed in a future release. Use the new Controls to filter and interact with your dashboard data.',
      }
    );
    return (
      <EuiToolTip content={tooltipText}>
        <EuiBadge
          iconType="warning"
          data-test-subj="embeddablePanelBadge-deprecated"
          aria-label={tooltipText}
        >
          {i18n.translate('inputControl.deprecationBadgeAction.deprecationBadgeLabel', {
            defaultMessage: 'Deprecated',
          })}
        </EuiBadge>
      </EuiToolTip>
    );
  }, [showBadges]);

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
