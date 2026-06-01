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
  EuiSpacer,
  EuiText,
  EuiTitle,
  type DropResult,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { FormattedMessage } from '@kbn/i18n-react';
import { DraggableItem } from './draggable_item';
import type { NavigationItemInfo } from '../types';

const descriptionStyles = css`
  margin-top: 4px;
`;

interface Props {
  items: NavigationItemInfo[];
  onDragEnd: (result: DropResult) => void;
  toggleItemVisibility: (id: string) => void;
}

export const VisibleItemsSection = ({ items, onDragEnd, toggleItemVisibility }: Props) => {
  return (
    <>
      <EuiFlexGroup alignItems="center" gutterSize="xs" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiTitle size="xs">
            <h4>
              <FormattedMessage
                id="navigationCustomizationComponents.orderAndVisibilityLabel"
                defaultMessage="Order and visibility"
              />
            </h4>
          </EuiTitle>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiText color="subdued" size="s" css={descriptionStyles}>
        <p>
          <FormattedMessage
            id="navigationCustomizationComponents.visibleInPrimaryNavDescription"
            defaultMessage="Reorder or hide apps in this space without affecting other users."
          />
        </p>
      </EuiText>
      <EuiSpacer size="s" />
      <EuiDragDropContext onDragEnd={onDragEnd}>
        <EuiDroppable droppableId="nav-items" spacing="none">
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
