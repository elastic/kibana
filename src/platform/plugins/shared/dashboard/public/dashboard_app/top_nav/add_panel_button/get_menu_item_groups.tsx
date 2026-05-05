/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useEffect, useState } from 'react';
import useAsync from 'react-use/lib/useAsync';
import { merge, switchMap, type Observable } from 'rxjs';

import { ADD_PANEL_OTHER_GROUP } from '@kbn/embeddable-plugin/public';
import type { PresentableGroup } from '@kbn/ui-actions-browser/src/types';
import { ADD_PANEL_TRIGGER } from '@kbn/ui-actions-plugin/common/trigger_ids';
import { triggers } from '@kbn/ui-actions-plugin/public';

import type { DashboardApi } from '../../../dashboard_api/types';
import { uiActionsService } from '../../../services/kibana_services';
import type { MenuItem, MenuItemGroup } from './types';

export const useMenuItemGroups = ({
  dashboardApi,
}: {
  dashboardApi: DashboardApi;
}): { groups: MenuItemGroup[] | undefined; loading: boolean; error: Error | undefined } => {
  const [groups, setGroups] = useState<MenuItemGroup[] | undefined>();

  const {
    value: menuGroupsResult,
    loading,
    error,
  } = useAsync(async () => {
    return await getMenuItemGroups(dashboardApi);
  }, [dashboardApi]);

  useEffect(() => setGroups(menuGroupsResult?.groups), [menuGroupsResult?.groups]);

  useEffect(() => {
    if (!menuGroupsResult?.recalculate$) return;
    const recalculateSubscription = menuGroupsResult.recalculate$
      .pipe(
        switchMap(async () => {
          return await getMenuItemGroups(dashboardApi);
        })
      )
      .subscribe((result) => {
        setGroups(result.groups);
      });

    return () => {
      recalculateSubscription?.unsubscribe();
    };
  }, [dashboardApi, menuGroupsResult?.recalculate$]);

  return { loading, error, groups };
};

export async function getMenuItemGroups(
  api: DashboardApi
): Promise<{ recalculate$: Observable<undefined>; groups: MenuItemGroup[] }> {
  const groups: Record<string, MenuItemGroup> = {};
  const addPanelContext = {
    embeddable: api,
    trigger: triggers[ADD_PANEL_TRIGGER],
  };
  function pushItem(group: PresentableGroup, item: MenuItem) {
    if (!groups[group.id]) {
      groups[group.id] = {
        id: group.id,
        title: group.getDisplayName?.(addPanelContext) ?? '',
        'data-test-subj': `dashboardEditorMenu-${group.id}Group`,
        order: group.order ?? 0,
        items: [],
      };
    }
    groups[group.id].items.push(item);
  }
  const disabledStateChangesSubjects: Array<Observable<undefined> | undefined> = [];

  (
    await uiActionsService.getTriggerCompatibleActions(ADD_PANEL_TRIGGER, { embeddable: api })
  ).forEach((action) => {
    const actionGroups = Array.isArray(action.grouping) ? action.grouping : [ADD_PANEL_OTHER_GROUP];
    actionGroups.forEach((group) => {
      const actionName = action.getDisplayName(addPanelContext);
      if (action.getDisabledStateChangesSubject) {
        disabledStateChangesSubjects.push(action.getDisabledStateChangesSubject(addPanelContext));
      }
      pushItem(group, {
        id: action.id,
        name: actionName,
        icon: action.getIconType?.(addPanelContext) ?? 'empty',
        onClick: (event: React.MouseEvent) => {
          api.clearOverlays();
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
          action.execute(addPanelContext);
        },
        'data-test-subj': `create-action-${actionName}`,
        description: action?.getDisplayNameTooltip?.(addPanelContext),
        isDisabled: action?.isDisabled?.(addPanelContext),
        order: action.order ?? 0,
        MenuItem: action.MenuItem ? action.MenuItem({ context: addPanelContext }) : undefined,
      });
    });
  });

  return {
    recalculate$: merge(...disabledStateChangesSubjects),
    groups: Object.values(groups)
      .map((group) => {
        group.items.sort((itemA, itemB) => {
          return itemA.order === itemB.order
            ? itemA.name.localeCompare(itemB.name)
            : itemB.order - itemA.order;
        });
        return group;
      })
      .sort((groupA, groupB) => groupB.order - groupA.order),
  };
}
