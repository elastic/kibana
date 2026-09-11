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
import { catchError, EMPTY, from, of, startWith, switchMap } from 'rxjs';
import type { DashboardApi } from '../../dashboard_api/types';
import { uiActionsService } from '../../services/kibana_services';
import {
  PRETTIFY_DASHBOARD_ACTION_ID,
  type PrettifyDashboardActionContext,
} from './prettify_dashboard_action';

const getPrettifyAction = async (): Promise<Action<PrettifyDashboardActionContext>> =>
  (await uiActionsService.getAction(
    PRETTIFY_DASHBOARD_ACTION_ID
  )) as Action<PrettifyDashboardActionContext>;

export interface UsePrettifyDashboardAction {
  execute: () => Promise<void>;
}

export const usePrettifyDashboardAction = (
  dashboardApi: DashboardApi
): UsePrettifyDashboardAction | null => {
  const [action, setAction] = useState<Action<PrettifyDashboardActionContext> | null>(null);
  const context = useMemo(
    () => ({
      dashboardApi,
      trigger: { id: PRETTIFY_DASHBOARD_ACTION_ID },
    }),
    [dashboardApi]
  );

  useEffect(() => {
    if (!uiActionsService.hasAction(PRETTIFY_DASHBOARD_ACTION_ID)) {
      setAction(null);
      return;
    }

    const subscription = from(getPrettifyAction())
      .pipe(
        switchMap((nextAction) =>
          (nextAction.getCompatibilityChangesSubject?.(context) ?? EMPTY).pipe(
            startWith(undefined),
            switchMap(async () => {
              try {
                return (await nextAction.isCompatible(context)) ? nextAction : null;
              } catch {
                return null;
              }
            })
          )
        ),
        catchError(() => of(null))
      )
      .subscribe(setAction);

    return () => {
      subscription.unsubscribe();
    };
  }, [context]);

  return useMemo(
    () =>
      action
        ? {
            execute: () => action.execute(context),
          }
        : null,
    [action, context]
  );
};
