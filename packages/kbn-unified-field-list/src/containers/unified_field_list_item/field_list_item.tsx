/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { memo, useCallback, useMemo } from 'react';
import { Draggable } from '@kbn/dom-drag-drop';
import { FieldItemButton } from '../../components/field_item_button';
import {
  getCommonFieldItemButtonProps,
  UnifiedFieldListItemPopover,
  type UnifiedFieldListItemPopoverProps,
  type UnifiedFieldListItemPopoverBaseProps,
  type GetCommonFieldItemButtonPropsParams,
} from './field_list_item_popover';

export type UnifiedFieldListItemProps = UnifiedFieldListItemPopoverBaseProps;

const UnifiedFieldListItemButtonComponent: UnifiedFieldListItemPopoverProps['ButtonComponent'] = ({
  options,
  alwaysShowActionButton = false,
  field,
  highlight,
  onAddFieldToWorkspace,
  onRemoveFieldFromWorkspace,
  isEmpty,
  isSelected,
  groupIndex,
  itemIndex,
  size,
  isPopoverOpen,
  onTogglePopover,
  onClosePopover,
}) => {
  const toggleDisplay: GetCommonFieldItemButtonPropsParams['toggleDisplay'] = useCallback(
    (f, isCurrentlySelected) => {
      onClosePopover();
      if (isCurrentlySelected) {
        onRemoveFieldFromWorkspace(f);
      } else {
        onAddFieldToWorkspace(f);
      }
    },
    [onAddFieldToWorkspace, onRemoveFieldFromWorkspace, onClosePopover]
  );

  const value = useMemo(
    () => ({
      id: field.name,
      humanData: {
        label: field.displayName,
        position: itemIndex + 1,
      },
    }),
    [field, itemIndex]
  );
  const order = useMemo(() => [0, groupIndex, itemIndex], [groupIndex, itemIndex]);
  const isDragDisabled = alwaysShowActionButton || options.disableFieldListItemDragAndDrop;

  return (
    <Draggable
      dragType="copy"
      dragClassName="unifiedFieldListItemButton__dragging"
      order={order}
      value={value}
      onDragStart={onClosePopover}
      isDisabled={isDragDisabled}
      dataTestSubj={`${
        options.dataTestSubj?.fieldListItemDndDataTestSubjPrefix ?? 'unifiedFieldListItemDnD'
      }-${field.name}`}
    >
      <FieldItemButton
        fieldSearchHighlight={highlight}
        isEmpty={isEmpty}
        isActive={isPopoverOpen}
        withDragIcon={!isDragDisabled}
        flush={alwaysShowActionButton ? 'both' : undefined}
        shouldAlwaysShowAction={alwaysShowActionButton}
        onClick={field.type !== '_source' ? onTogglePopover : undefined}
        {...getCommonFieldItemButtonProps({
          options,
          field,
          isSelected,
          toggleDisplay,
          size,
        })}
      />
    </Draggable>
  );
};

function UnifiedFieldListItemComponent(props: UnifiedFieldListItemProps) {
  return (
    <UnifiedFieldListItemPopover {...props} ButtonComponent={UnifiedFieldListItemButtonComponent} />
  );
}

export const UnifiedFieldListItem = memo(UnifiedFieldListItemComponent);
