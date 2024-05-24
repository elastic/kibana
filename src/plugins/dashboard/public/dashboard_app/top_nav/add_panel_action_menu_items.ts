/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { ActionExecutionContext, Action } from '@kbn/ui-actions-plugin/public';
import { PresentationContainer } from '@kbn/presentation-containers';
import type { IconType, CommonProps } from '@elastic/eui';
import React, { type MouseEventHandler, ReactElement } from 'react';
import { addPanelMenuTrigger } from '../../triggers';

export interface PanelSelectionMenuItem extends Pick<CommonProps, 'data-test-subj'> {
  id: string;
  name: string | ReactElement;
  icon: IconType;
  onClick: MouseEventHandler;
  toolTipContent?: string;
}

export type GroupedAddPanelActions = Pick<PanelSelectionMenuItem, 'id'> & {
  title: string;
  items: PanelSelectionMenuItem[];
};

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

export const getAddPanelActionMenuItemsGroup = (
  api: PresentationContainer,
  actions: Array<Action<object>> | undefined,
  closePopover: () => void
) => {
  const grouped: Record<string, GroupedAddPanelActions> = {};

  const context = {
    embeddable: api,
    trigger: addPanelMenuTrigger,
  };

  const getMenuItem = (item: Action<object>) => {
    const actionName = item.getDisplayName(context);

    return {
      id: item.id,
      name: actionName,
      icon:
        (typeof item.getIconType === 'function' ? item.getIconType(context) : undefined) ?? 'empty',
      onClick: onAddPanelActionClick(item, context, closePopover),
      'data-test-subj': `create-action-${actionName}`,
      toolTipContent: item?.getDisplayNameTooltip?.(context),
    };
  };

  actions?.forEach((item) => {
    if (Array.isArray(item.grouping)) {
      item.grouping.forEach((group) => {
        if (!grouped[group.id]) {
          grouped[group.id] = {
            id: group.id,
            title: group.getDisplayName ? group.getDisplayName(context) : '',
            items: [],
          };
        }

        grouped[group.id]!.items!.push(getMenuItem(item));
      });
    }
  });

  return grouped;
};
