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
  EuiDroppable,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIconTip,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { DraggableItem } from './draggable_item';
import { EmptyDropPlaceholder } from './empty_drop_placeholder';
import { HIDDEN_DROPPABLE_ID } from './use_item_list';
import type { NavigationItemInfo } from '../types';

interface Props {
  items: NavigationItemInfo[];
  toggleItemVisibility: (id: string) => void;
}

export const HiddenItemsSection = ({ items, toggleItemVisibility }: Props) => {
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
      <EuiDroppable droppableId={HIDDEN_DROPPABLE_ID} spacing="none">
        {items.length > 0 ? (
          items.map((item, index) => (
            <DraggableItem
              key={item.id}
              item={item}
              index={index}
              toggleItemVisibility={toggleItemVisibility}
            />
          ))
        ) : (
          <EmptyDropPlaceholder
            message={i18n.translate('navigationCustomizationComponents.emptyHiddenList', {
              defaultMessage: 'Drag an item here to hide it under More.',
            })}
          />
        )}
      </EuiDroppable>
    </>
  );
};
