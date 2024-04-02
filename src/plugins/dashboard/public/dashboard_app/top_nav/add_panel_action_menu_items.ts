/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import type { ActionExecutionContext, Action } from '@kbn/ui-actions-plugin/public';
import { PresentationContainer } from '@kbn/presentation-containers';
import type {
  EuiContextMenuPanelDescriptor,
  EuiContextMenuPanelItemDescriptor,
} from '@elastic/eui';
import { addPanelMenuTrigger } from '../../triggers';

const onAddPanelActionClick =
  (action: Action, context: ActionExecutionContext<object>, closePopover: () => void) =>
  (event: React.MouseEvent) => {
    closePopover();
    if (event.currentTarget instanceof HTMLAnchorElement) {
      if (
        !event.defaultPrevented && // onClick prevented default
        event.button === 0 &&
        (!event.currentTarget.target || event.currentTarget.target === '_self') &&
        !(event.metaKey || event.altKey || event.ctrlKey || event.shiftKey)
      ) {
        event.preventDefault();
        action.execute(context);
      }
    } else action.execute(context);
  };

export const getAddPanelActionMenuItems = (
  api: PresentationContainer,
  actions: Array<Action<object>> | undefined,
  closePopover: () => void
): [EuiContextMenuPanelItemDescriptor[], Record<string, EuiContextMenuPanelDescriptor>] => {
  const ungrouped: EuiContextMenuPanelItemDescriptor[] = [];
  const grouped: Record<string, EuiContextMenuPanelDescriptor> = {};

  const context = {
    embeddable: api,
    trigger: addPanelMenuTrigger,
  };

  const getMenuItem = (item: Action<object>) => {
    const actionName = item.getDisplayName(context);

    return {
      name: actionName,
      icon: item.getIconType(context),
      onClick: onAddPanelActionClick(item, context, closePopover),
      'data-test-subj': `create-action-${actionName}`,
      toolTipContent: item?.getDisplayNameTooltip?.(context),
    };
  };

  actions?.forEach((item) => {
    if (Array.isArray(item.grouping)) {
      item.grouping.forEach((group) => {
        const actionName = item.getDisplayName(context);

        if (!grouped[group.id]) {
          grouped[group.id] = {
            id: group.id,
            // @ts-expect-error
            title: group.getDisplayName(context),
            items: [],
          };
        }

        grouped[group.id]!.items!.push({
          name: actionName,
          icon: item.getIconType(context),
          onClick: onAddPanelActionClick(item, context, closePopover),
          'data-test-subj': `create-action-${actionName}`,
          toolTipContent: item?.getDisplayNameTooltip?.(context),
        });
      });
    } else {
      ungrouped.push(getMenuItem(item));
    }
  });

  return [ungrouped, grouped];
};
