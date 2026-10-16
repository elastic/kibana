/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useEffect, useMemo, useState } from 'react';
import type { Action } from '@kbn/ui-actions-plugin/public';
import { catchError, EMPTY, from, map, of, startWith, switchMap } from 'rxjs';
import type { DashboardApi } from '../../dashboard_api/types';
import { uiActionsService } from '../../services/kibana_services';
import {
  ENHANCE_DASHBOARD_ACTION_ID,
  type EnhanceDashboardActionContext,
} from './enhance_dashboard_action';

const getEnhanceAction = async (): Promise<Action<EnhanceDashboardActionContext>> =>
  (await uiActionsService.getAction(
    ENHANCE_DASHBOARD_ACTION_ID
  )) as Action<EnhanceDashboardActionContext>;

interface CompatibleEnhanceAction {
  action: Action<EnhanceDashboardActionContext>;
  isDisabled: boolean;
  tooltip: string;
}

export interface UseEnhanceDashboardAction {
  execute: () => Promise<void>;
  isDisabled: boolean;
  tooltip: string;
}

export const useEnhanceDashboardAction = (
  dashboardApi: DashboardApi
): UseEnhanceDashboardAction | null => {
  const [compatibleAction, setCompatibleAction] = useState<CompatibleEnhanceAction | null>(null);
  const context = useMemo(
    () => ({
      dashboardApi,
      trigger: { id: ENHANCE_DASHBOARD_ACTION_ID },
    }),
    [dashboardApi]
  );

  useEffect(() => {
    if (!uiActionsService.hasAction(ENHANCE_DASHBOARD_ACTION_ID)) {
      setCompatibleAction(null);
      return;
    }

    const subscription = from(getEnhanceAction())
      .pipe(
        switchMap((nextAction) =>
          (nextAction.getCompatibilityChangesSubject?.(context) ?? EMPTY).pipe(
            startWith(undefined),
            switchMap(async () => {
              try {
                return await nextAction.isCompatible(context);
              } catch {
                return false;
              }
            }),
            switchMap((isCompatible) =>
              isCompatible
                ? (nextAction.getDisabledStateChangesSubject?.(context) ?? EMPTY).pipe(
                    startWith(undefined),
                    map(() => ({
                      action: nextAction,
                      isDisabled: nextAction.isDisabled?.(context) ?? false,
                      tooltip: nextAction.getDisplayNameTooltip?.(context) ?? '',
                    }))
                  )
                : of(null)
            )
          )
        ),
        catchError(() => of(null))
      )
      .subscribe(setCompatibleAction);

    return () => {
      subscription.unsubscribe();
    };
  }, [context]);

  return useMemo(
    () =>
      compatibleAction
        ? {
            execute: () => compatibleAction.action.execute(context),
            isDisabled: compatibleAction.isDisabled,
            tooltip: compatibleAction.tooltip,
          }
        : null,
    [compatibleAction, context]
  );
};
