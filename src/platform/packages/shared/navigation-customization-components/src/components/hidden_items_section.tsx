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
  EuiDragDropContext,
  EuiDroppable,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIconTip,
  EuiSpacer,
  EuiTitle,
  type DropResult,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { DraggableItem } from './draggable_item';
import type { NavigationItemInfo } from '../types';

interface Props {
  items: NavigationItemInfo[];
  onDragEnd: (result: DropResult) => void;
  toggleItemVisibility: (id: string) => void;
}

export const HiddenItemsSection = ({ items, onDragEnd, toggleItemVisibility }: Props) => {
  if (items.length === 0) return null;

  return (
    <>
      <EuiSpacer size="s" />
      <EuiFlexGroup alignItems="center" gutterSize="xs" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiTitle size="xs">
            <h4>
              <FormattedMessage
                id="navigationCustomizationComponents.moreLabel"
                defaultMessage="Hide under More"
              />
            </h4>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiIconTip
            color="subdued"
            content={i18n.translate('navigationCustomizationComponents.moreTooltip', {
              defaultMessage: 'With limited screen space, visible items may appear under More too',
            })}
            position="right"
            type="info"
          />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="s" />
      <EuiDragDropContext onDragEnd={onDragEnd}>
        <EuiDroppable droppableId="hidden-nav-items" spacing="none">
          {items.map((item, index) => (
            <DraggableItem
              key={item.id}
              item={item}
              index={index}
              toggleItemVisibility={toggleItemVisibility}
            />
          ))}
        </EuiDroppable>
      </EuiDragDropContext>
    </>
  );
};
