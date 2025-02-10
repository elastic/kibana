/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { VisGroups } from '@kbn/visualizations-plugin/public';
import { ADD_PANEL_TRIGGER } from '@kbn/ui-actions-plugin/public';
import {
  ADD_PANEL_ANNOTATION_GROUP,
  ADD_PANEL_OTHER_GROUP,
  ADD_PANEL_VISUALIZATION_GROUP,
} from '@kbn/embeddable-plugin/public';
import type { TracksOverlays } from '@kbn/presentation-containers';
import { PresentableGroup } from '@kbn/ui-actions-browser/src/types';
import { addPanelMenuTrigger } from '@kbn/ui-actions-plugin/public';
import type { HasAppContext } from '@kbn/presentation-publishing';
import { uiActionsService, visualizationsService } from '../../../services/kibana_services';
import { navigateToVisEditor } from './navigate_to_vis_editor';
import type { MenuItem, MenuItemGroup } from './types';

const VIS_GROUP_TO_ADD_PANEL_GROUP: Record<string, PresentableGroup> = {
  [VisGroups.PROMOTED]: ADD_PANEL_VISUALIZATION_GROUP,
  [VisGroups.TOOLS]: ADD_PANEL_ANNOTATION_GROUP,
};

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

  // add menu items from vis types
  visualizationsService.all().forEach((visType) => {
    if (visType.disableCreate) return;

    const group = VIS_GROUP_TO_ADD_PANEL_GROUP[visType.group];
    if (!group) return;
    pushItem(group, {
      id: visType.name,
      name: visType.titleInWizard || visType.title,
      isDeprecated: visType.isDeprecated,
      icon: visType.icon ?? 'empty',
      onClick: () => {
        api.clearOverlays();
        navigateToVisEditor(api, visType);
      },
      'data-test-subj': `visType-${visType.name}`,
      description: visType.description,
      order: visType.order,
    });
  });

  // add menu items from vis alias
  visualizationsService.getAliases().forEach((visTypeAlias) => {
    if (visTypeAlias.disableCreate) return;
    pushItem(ADD_PANEL_VISUALIZATION_GROUP, {
      id: visTypeAlias.name,
      name: visTypeAlias.title,
      icon: visTypeAlias.icon ?? 'empty',
      onClick: () => {
        api.clearOverlays();
        navigateToVisEditor(api, visTypeAlias);
      },
      'data-test-subj': `visType-${visTypeAlias.name}`,
      description: visTypeAlias.description,
      order: visTypeAlias.order ?? 0,
    });
  });

  // add menu items from "add panel" actions
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
