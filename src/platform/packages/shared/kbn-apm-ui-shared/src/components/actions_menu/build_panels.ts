/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EuiContextMenuPanelDescriptor, EuiThemeComputed } from '@elastic/eui';
import { getEbtProps } from '@kbn/ebt-click';
import type { ActionGroups } from './types';

export function buildPanels(
  actions: ActionGroups,
  closePopover: () => void,
  euiTheme: EuiThemeComputed,
  dataTestSubjPrefix: string
): EuiContextMenuPanelDescriptor[] {
  const mainPanelItems: EuiContextMenuPanelDescriptor['items'] = [];
  const subPanels: EuiContextMenuPanelDescriptor[] = [];
  let subPanelId = 1;

  for (const [groupIndex, group] of actions.entries()) {
    if (group.groupLabel) {
      mainPanelItems.push({
        name: group.groupLabel,
        disabled: true,
        css: {
          fontWeight: 700,
          color: euiTheme.colors.textParagraph,
          borderBottom: euiTheme.border.thin as string,
          marginTop: groupIndex > 0 ? euiTheme.size.m : 0,
        },
        'data-test-subj': `${dataTestSubjPrefix}Group-${group.id}`,
      });
    }

    for (const action of group.actions) {
      const validSubItems =
        action.items?.filter((subItem) => subItem.href != null || subItem.onClick != null) ?? [];

      if (validSubItems.length > 0) {
        const panelId = subPanelId++;

        mainPanelItems.push({
          name: action.name,
          icon: action.icon,
          panel: panelId,
          ...getEbtProps(action.ebt),
          'data-test-subj': `${dataTestSubjPrefix}Item-${action.id}`,
        });

        subPanels.push({
          id: panelId,
          title: action.name,
          items: validSubItems.map((subItem) => ({
            name: subItem.name,
            icon: subItem.icon,
            ...(subItem.href
              ? { href: subItem.href, target: '_self' as const }
              : {
                  onClick: () => {
                    subItem.onClick?.();
                    closePopover();
                  },
                }),
            ...getEbtProps(subItem.ebt),
            'data-test-subj': `${dataTestSubjPrefix}Item-${subItem.id}`,
          })),
        });
      } else if (action.href != null || action.onClick != null) {
        mainPanelItems.push({
          name: action.name,
          icon: action.icon,
          ...(action.href
            ? { href: action.href, target: '_self' as const }
            : {
                onClick: () => {
                  action.onClick?.();
                  closePopover();
                },
              }),
          ...getEbtProps(action.ebt),
          'data-test-subj': `${dataTestSubjPrefix}Item-${action.id}`,
        });
      }
    }
  }

  return [{ id: 0, items: mainPanelItems }, ...subPanels];
}
