/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useEffect, useMemo, useState } from 'react';
import useAsync from 'react-use/lib/useAsync';
import { merge, startWith, type Observable } from 'rxjs';

import { ADD_PANEL_OTHER_GROUP } from '@kbn/embeddable-plugin/public';
import type { PresentableGroup } from '@kbn/ui-actions-browser/src/types';
import { ADD_PANEL_TRIGGER } from '@kbn/ui-actions-plugin/common/trigger_ids';
import { triggers, type Action, type ActionExecutionContext } from '@kbn/ui-actions-plugin/public';

import type { DashboardApi } from '../../../dashboard_api/types';
import { uiActionsService } from '../../../services/kibana_services';
import type { MenuItemGroup } from './types';

export const useMenuItemGroups = ({
  dashboardApi,
}: {
  dashboardApi: DashboardApi;
}): { groups: MenuItemGroup[] | undefined; loading: boolean; error: Error | undefined } => {
  const context = useMemo(
    () => ({
      embeddable: dashboardApi,
      trigger: triggers[ADD_PANEL_TRIGGER],
    }),
    [dashboardApi]
  );

  const [groups, setGroups] = useState<MenuItemGroup[] | undefined>();
  const {
    value: result,
    loading,
    error,
  } = useAsync(async () => {
    return await getActionGroups(dashboardApi, context);
  }, [dashboardApi, context]);

  useEffect(() => {
    if (!result) return;
    const generateListSubscription = result?.generateMenuItemGroups$.subscribe(() => {
      setGroups(generateMenuItemGroups(result.groups, dashboardApi, context));
    });
    return () => {
      generateListSubscription?.unsubscribe();
    };
  }, [result, dashboardApi, context]);

  return { loading, error, groups };
};

async function getActionGroups(
  api: DashboardApi,
  context: ActionExecutionContext<object>
): Promise<{
  groups: Record<string, { group: PresentableGroup; actions: Action[] }>;
  generateMenuItemGroups$: Observable<void>;
}> {
  const groups: Record<string, { group: PresentableGroup; actions: Action[] }> = {};
  const disabledStateChangesSubjects: Array<Observable<void> | undefined> = [];

  (
    await uiActionsService.getTriggerCompatibleActions(ADD_PANEL_TRIGGER, { embeddable: api })
  ).forEach((action) => {
    const actionGroups = Array.isArray(action.grouping) ? action.grouping : [ADD_PANEL_OTHER_GROUP];
    if (action.getDisabledStateChangesSubject) {
      disabledStateChangesSubjects.push(action.getDisabledStateChangesSubject(context));
    }
    actionGroups.forEach((group) => {
      if (!groups[group.id]) {
        groups[group.id] = {
          group,
          actions: [],
        };
      }
      groups[group.id].actions.push(action);
    });
  });

  return {
    groups,
    generateMenuItemGroups$: merge(...disabledStateChangesSubjects).pipe(startWith(undefined)),
  };
}

function generateMenuItemGroups(
  groups: Record<string, { group: PresentableGroup; actions: Action[] }>,
  dashboardApi: DashboardApi,
  context: ActionExecutionContext
): MenuItemGroup[] {
  return Object.entries(groups ?? {})
    .map(([groupId, { group, actions }]) => {
      return {
        id: groupId,
        title: group.getDisplayName?.(context) ?? '',
        'data-test-subj': `dashboardEditorMenu-${group.id}Group`,
        order: group.order ?? 0,
        items: actions
          .map((action) => {
            const actionName = action.getDisplayName(context);
            return {
              id: action.id,
              name: actionName,
              icon: action.getIconType?.(context) ?? 'empty',
              onClick: (event: React.MouseEvent) => {
                dashboardApi.clearOverlays();
                if (event.currentTarget instanceof HTMLAnchorElement) {
                  if (
                    !event.defaultPrevented && // onClick prevented default
                    event.button === 0 &&
                    (!event.currentTarget.target || event.currentTarget.target === '_self') &&
                    !(event.metaKey || event.altKey || event.ctrlKey || event.shiftKey)
                  ) {
                    event.preventDefault();
                  }
                }
                action.execute(context);
              },
              'data-test-subj': `create-action-${actionName}`,
              description: action?.getDisplayNameTooltip?.(context),
              isDisabled: action?.isDisabled?.(context),
              order: action.order ?? 0,
              MenuItem: action.MenuItem ? action.MenuItem({ context }) : undefined,
            };
          })
          .sort((itemA, itemB) => {
            return itemA.order === itemB.order
              ? itemA.name.localeCompare(itemB.name)
              : itemB.order - itemA.order;
          }),
      };
    })
    .sort((groupA, groupB) => groupB.order - groupA.order);
}
