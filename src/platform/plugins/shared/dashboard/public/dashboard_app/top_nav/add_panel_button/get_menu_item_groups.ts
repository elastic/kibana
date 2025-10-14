/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ADD_PANEL_TRIGGER } from '@kbn/ui-actions-plugin/public';
import { ADD_PANEL_OTHER_GROUP } from '@kbn/embeddable-plugin/public';
import { type TracksOverlays } from '@kbn/presentation-util';
import type { PresentableGroup } from '@kbn/ui-actions-browser/src/types';
import { addPanelMenuTrigger } from '@kbn/ui-actions-plugin/public';
import type { HasAppContext } from '@kbn/presentation-publishing';
import type { Subscription } from 'rxjs';
import { BehaviorSubject, buffer, debounceTime, skip } from 'rxjs';
import type { Action } from '@kbn/ui-actions-plugin/public/actions/action';
import { asyncForEach } from '@kbn/std';
import { uiActionsService } from '../../../services/kibana_services';
import type { MenuItemGroup } from './types';

const formatMenuItemGroups = (groups: Record<string, MenuItemGroup>) =>
  Object.values(groups)
    .map((group) => {
      group.items.sort((itemA, itemB) => {
        return itemA.order === itemB.order
          ? itemA.name.localeCompare(itemB.name)
          : itemB.order - itemA.order;
      });
      return group;
    })
    .sort((groupA, groupB) => groupB.order - groupA.order);

// Return an observable list of menu item groups. An observable is used so that the menu can subscribe to
// any action compatibility changes, and trigger a re-render without the user having to close and reopen the menu
export async function getMenuItemGroups(api: HasAppContext & TracksOverlays): Promise<{
  groups$: BehaviorSubject<MenuItemGroup[]>;
  cleanup: () => void;
}> {
  const groups: Record<string, MenuItemGroup> = {};

  const addPanelContext = {
    embeddable: api,
    trigger: addPanelMenuTrigger,
  };
  const pushActionToGroup = (action: Action, group: PresentableGroup, isCompatible: boolean) => {
    const actionName = action.getDisplayName(addPanelContext);
    const item = {
      id: action.id,
      name: actionName,
      icon: action.getIconType?.(addPanelContext) ?? 'empty',
      isDisabled: !isCompatible,
      onClick: isCompatible
        ? (event: React.MouseEvent) => {
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
          }
        : () => {},
      'data-test-subj': `create-action-${actionName}`,
      description: action?.getDisplayNameTooltip?.(addPanelContext),
      order: action.order ?? 0,
      MenuItem: action.MenuItem ? action.MenuItem({ context: addPanelContext }) : undefined,
    };
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
  };

  const compatibilityChange$ = new BehaviorSubject<[string, boolean] | undefined>(undefined);
  const compatibilityChangeSubscriptions: Subscription[] = [];
  const actionContext = {
    embeddable: api,
    trigger: uiActionsService.getTrigger(ADD_PANEL_TRIGGER),
  };
  const addPanelActions = await uiActionsService.getTriggerActions(ADD_PANEL_TRIGGER);

  await asyncForEach(addPanelActions, async (action) => {
    const isCompatible = await action.isCompatible(actionContext);
    if (!isCompatible && !action.getCompatibilityChangesSubject) return;

    const actionGroups = Array.isArray(action.grouping) ? action.grouping : [ADD_PANEL_OTHER_GROUP];
    actionGroups.forEach((group) => pushActionToGroup(action, group, isCompatible));

    if (action.getCompatibilityChangesSubject) {
      const compatibilityChangeSubscription = action
        .getCompatibilityChangesSubject(actionContext)
        ?.pipe(skip(1))
        .subscribe(async () => {
          const nextIsCompatible = await action.isCompatible(actionContext);
          compatibilityChange$.next([action.id, nextIsCompatible]);
        });
      if (compatibilityChangeSubscription)
        compatibilityChangeSubscriptions.push(compatibilityChangeSubscription);
    }
  });

  const groups$ = new BehaviorSubject(groups);
  const formattedGroups$ = new BehaviorSubject<MenuItemGroup[]>(formatMenuItemGroups(groups));

  const groupSubscription = groups$.subscribe((nextGroups) => {
    formattedGroups$.next(formatMenuItemGroups(nextGroups));
  });

  const updateCompatibilitySubscription = compatibilityChange$
    .pipe(
      skip(1),
      // Buffer the last 100ms of changes and combine them into an array, in case multiple actions change their compatibility at the same time
      buffer(compatibilityChange$.pipe(debounceTime(100)))
    )
    .subscribe((updates) => {
      if (!updates.length) return;
      const prevGroups = groups$.getValue();
      const nextGroups: Record<string, MenuItemGroup> = prevGroups;
      for (const update of updates) {
        if (!update) return;
        const [actionId, isCompatible] = update;
        for (const [groupId, group] of Object.entries(prevGroups)) {
          const matchingItemIndex = group.items.findIndex((item) => item.id === actionId);
          if (matchingItemIndex > -1) {
            const nextItems = [...group.items];
            nextItems[matchingItemIndex].isDisabled = !isCompatible;
            nextGroups[groupId] = { ...group, items: nextItems };
          }
        }
      }
      groups$.next(nextGroups);
    });

  return {
    groups$: formattedGroups$,
    cleanup: () => {
      compatibilityChangeSubscriptions.forEach((sub) => sub.unsubscribe());
      updateCompatibilitySubscription.unsubscribe();
      groupSubscription.unsubscribe();
    },
  };
}
