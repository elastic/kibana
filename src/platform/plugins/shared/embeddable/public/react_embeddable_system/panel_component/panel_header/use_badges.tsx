/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiBadge, EuiToolTip } from '@elastic/eui';
import React, { useEffect, useMemo, useState } from 'react';
import { Subscription, switchMap } from 'rxjs';

import { PANEL_BADGE_TRIGGER } from '@kbn/ui-actions-plugin/common/trigger_ids';
import type { Action } from '@kbn/ui-actions-plugin/public';
import { triggers } from '@kbn/ui-actions-plugin/public';
import type { EmbeddableApiContext } from '@kbn/presentation-publishing';
import { uiActions } from '../../../kibana_services';
import type { DefaultPresentationPanelApi, PresentationPanelProps } from '../types';

export const useBadges = <
  ApiType extends DefaultPresentationPanelApi = DefaultPresentationPanelApi
>(
  showBadges: boolean,
  api: ApiType,
  getActions: PresentationPanelProps['getActions']
) => {
  const [badges, setBadges] = useState<Action<EmbeddableApiContext>[]>([]);

  /**
   * Get all actions once on mount of the panel. Any actions that are Frequent Compatibility
   * Change Actions need to be subscribed to so they can change over the lifetime of this panel.
   */
  useEffect(() => {
    if (!showBadges) {
      setBadges([]);
      return;
    }

    let canceled = false;
    const subscriptions = new Subscription();
    const getTriggerCompatibleActions = getActions ?? uiActions.getTriggerCompatibleActions;
    const getActionsForTrigger = async (triggerId: string) => {
      let nextActions: Action<EmbeddableApiContext>[] =
        ((await getTriggerCompatibleActions(triggerId, {
          embeddable: api,
        })) as Action<EmbeddableApiContext>[]) ?? [];

      const disabledActions = api.disabledActionIds$?.value ?? [];
      nextActions = nextActions.filter((badge) => disabledActions.indexOf(badge.id) === -1);
      return nextActions;
    };

    const handleActionCompatibilityChange = (
      isCompatible: boolean,
      action: Action<EmbeddableApiContext>
    ) => {
      if (canceled) return;
      setBadges((currentActions) => {
        const newActions = currentActions?.filter((current) => current.id !== action.id);
        if (isCompatible) return [...newActions, action];
        return newActions;
      });
    };

    (async () => {
      const initialBadges = await getActionsForTrigger(PANEL_BADGE_TRIGGER);
      if (canceled) return;
      setBadges(initialBadges);

      const apiContext = { embeddable: api };

      // subscribe to any frequently changing badge actions
      const frequentlyChangingBadges = await uiActions.getFrequentlyChangingActionsForTrigger(
        PANEL_BADGE_TRIGGER,
        apiContext
      );
      if (canceled) return;
      for (const badge of frequentlyChangingBadges) {
        const compatibilitySubject = badge
          .getCompatibilityChangesSubject(apiContext)
          ?.pipe(
            switchMap(async () => {
              return await badge.isCompatible({
                ...apiContext,
                trigger: triggers[PANEL_BADGE_TRIGGER],
              });
            })
          )
          .subscribe(async (isCompatible) => {
            handleActionCompatibilityChange(isCompatible, badge as Action<EmbeddableApiContext>);
          });
        subscriptions.add(compatibilitySubject);
      }
    })();

    return () => {
      canceled = true;
      subscriptions.unsubscribe();
    };
  }, [showBadges, api, getActions]);

  return useMemo(() => {
    return badges?.map((badge) => {
      const tooltipText = badge.getDisplayNameTooltip?.({
        embeddable: api,
        trigger: triggers[PANEL_BADGE_TRIGGER],
      });
      const badgeElement = (
        <EuiBadge
          key={badge.id}
          iconType={badge.getIconType({ embeddable: api, trigger: triggers[PANEL_BADGE_TRIGGER] })}
          onClick={() => badge.execute({ embeddable: api, trigger: triggers[PANEL_BADGE_TRIGGER] })}
          onClickAriaLabel={badge.getDisplayName({
            embeddable: api,
            trigger: triggers[PANEL_BADGE_TRIGGER],
          })}
          data-test-subj={`embeddablePanelBadge-${badge.id}`}
          {...(tooltipText ? { 'aria-label': tooltipText } : {})}
        >
          {badge.MenuItem
            ? React.createElement(badge.MenuItem, {
                context: {
                  embeddable: api,
                  trigger: triggers[PANEL_BADGE_TRIGGER],
                },
              })
            : badge.getDisplayName({ embeddable: api, trigger: triggers[PANEL_BADGE_TRIGGER] })}
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
  }, [api, badges]);
};
