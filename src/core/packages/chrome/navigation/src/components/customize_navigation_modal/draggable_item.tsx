/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import {
  EuiCheckbox,
  EuiDraggable,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiPanel,
  EuiText,
} from '@elastic/eui';
import type { NavigationItemInfo } from '@kbn/core-chrome-browser';
import { i18n } from '@kbn/i18n';

interface Props {
  item: NavigationItemInfo;
  index: number;
  toggleItemVisibility: (id: string) => void;
}

export const DraggableItem = ({ item, index, toggleItemVisibility }: Props) => (
  <EuiDraggable
    key={item.id}
    index={index}
    draggableId={item.id}
    customDragHandle
    hasInteractiveChildren
    usePortal
  >
    {(provided) => (
      <EuiPanel paddingSize="s" hasShadow={false}>
        <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
          <EuiFlexItem grow={false}>
            <div
              {...provided.dragHandleProps}
              aria-label={i18n.translate(
                'core.ui.chrome.sideNavigation.customizeNavigation.dragHandleAriaLabel',
                {
                  defaultMessage: 'Drag handle for {itemTitle}',
                  values: { itemTitle: item.title },
                }
              )}
            >
              <EuiIcon type="grab" color="subdued" aria-hidden={true} />
            </div>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiCheckbox
              id={`visibility-${item.id}`}
              checked={!item.hidden}
              onChange={() => toggleItemVisibility(item.id)}
              aria-label={i18n.translate(
                'core.ui.chrome.sideNavigation.customizeNavigation.draggableItemAriaLabel',
                {
                  defaultMessage: 'Show {itemTitle}',
                  values: { itemTitle: item.title },
                }
              )}
            />
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiText size="s">{item.title}</EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanel>
    )}
  </EuiDraggable>
);
