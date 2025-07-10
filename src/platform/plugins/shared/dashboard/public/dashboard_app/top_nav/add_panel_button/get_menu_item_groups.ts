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
import type { TracksOverlays } from '@kbn/presentation-containers';
import { PresentableGroup } from '@kbn/ui-actions-browser/src/types';
import { addPanelMenuTrigger } from '@kbn/ui-actions-plugin/public';
import type { HasAppContext } from '@kbn/presentation-publishing';
import { uiActionsService } from '../../../services/kibana_services';
import type { MenuItem, MenuItemGroup } from './types';

export async function getMenuItemGroups(
  api: HasAppContext & TracksOverlays
): Promise<MenuItemGroup[]> {
  const groups: Record<string, MenuItemGroup> = {};
  const addPanelContext = {
    embeddable: api,
    trigger: addPanelMenuTrigger,
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

  (
    await uiActionsService.getTriggerCompatibleActions(ADD_PANEL_TRIGGER, { embeddable: api })
  ).forEach((action) => {
    const actionGroups = Array.isArray(action.grouping) ? action.grouping : [ADD_PANEL_OTHER_GROUP];
    actionGroups.forEach((group) => {
      const actionName = action.getDisplayName(addPanelContext);
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
        order: action.order ?? 0,
      });
    });
  });

  return Object.values(groups)
    .map((group) => {
      group.items.sort((itemA, itemB) => {
        return itemA.order === itemB.order
          ? itemA.name.localeCompare(itemB.name)
          : itemB.order - itemA.order;
      });
      return group;
    })
    .sort((groupA, groupB) => groupB.order - groupA.order);
}
