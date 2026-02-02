/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useState, type ComponentProps } from 'react';
import type { EuiDragDropContext } from '@elastic/eui';
import {
  EuiButtonEmpty,
  EuiContextMenu,
  EuiPopover,
  EuiPopoverFooter,
  EuiText,
  euiDragDropReorder,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useDataCascadeState, useDataCascadeActions } from '../../../../store_provider';
import { SelectedListComponent, SelectionButtonComponent } from './blocks';

export interface SelectionDropdownProps {
  onSelectionChange: (groupByColumn: string[]) => void;
}

export function SelectionDropdown({ onSelectionChange }: SelectionDropdownProps) {
  const [isPopoverOpen, setPopover] = useState(false);
  const { groupByColumns, currentGroupByColumns } = useDataCascadeState();
  const actions = useDataCascadeActions();

  const onButtonClick = useCallback(() => {
    setPopover(!isPopoverOpen);
  }, [setPopover, isPopoverOpen]);

  const closePopover = useCallback(() => {
    setPopover(false);
  }, [setPopover]);

  const onGroupByColumnSelection = useCallback(
    (groupByColumn: string) => {
      onSelectionChange([...currentGroupByColumns, groupByColumn]);
      closePopover();
    },
    [currentGroupByColumns, onSelectionChange, closePopover]
  );

  const clearSelectedGroupByColumn = useCallback(() => {
    actions.resetActiveCascadeGroups();
  }, [actions]);

  const onDragEnd = useCallback<ComponentProps<typeof EuiDragDropContext>['onDragEnd']>(
    ({ source, destination }) => {
      if (source && destination) {
        const items = euiDragDropReorder(currentGroupByColumns, source.index, destination.index);

        onSelectionChange(items);
      }
    },
    [currentGroupByColumns, onSelectionChange]
  );

  const button = (
    <EuiButtonEmpty
      aria-label="Group by columns"
      iconType="inspect"
      onClick={onButtonClick}
      flush="right"
    >
      {i18n.translate('sharedUXPackages.data_cascade.selection_dropdown.selection_message', {
        defaultMessage:
          'Group By: {groupedColumnsCount, plural, one {# group selected} other {# groups selected}}',
        values: { groupedColumnsCount: currentGroupByColumns.length },
      })}
    </EuiButtonEmpty>
  );

  const selectedListRenderer = useCallback(() => {
    return currentGroupByColumns.length ? (
      <SelectedListComponent selectionListItems={currentGroupByColumns} onDragEnd={onDragEnd} />
    ) : (
      <EuiText>
        {i18n.translate('sharedUXPackages.data_cascade.selection_dropdown.no_selection_message', {
          defaultMessage: 'No selection',
        })}
      </EuiText>
    );
  }, [currentGroupByColumns, onDragEnd]);

  const selectionButtonRenderer = useCallback(() => {
    const availableColumnsForSelection = groupByColumns?.filter(
      (groupByColumn) => currentGroupByColumns.indexOf(groupByColumn) === -1
    );

    return (
      <EuiPopoverFooter paddingSize="s">
        <SelectionButtonComponent
          selectionOptions={availableColumnsForSelection}
          selectedOptions={currentGroupByColumns}
          onSelection={onGroupByColumnSelection}
          clearSelection={clearSelectedGroupByColumn}
        />
      </EuiPopoverFooter>
    );
  }, [groupByColumns, currentGroupByColumns, onGroupByColumnSelection, clearSelectedGroupByColumn]);

  return (
    <EuiPopover
      button={button}
      isOpen={isPopoverOpen}
      closePopover={closePopover}
      panelPaddingSize="s"
      data-test-subj="DataCascadeColumnSelectionPopover"
    >
      <EuiContextMenu
        size="m"
        initialPanelId={0}
        css={{ minWidth: 300 }}
        panels={[
          {
            id: 0,
            items: [
              {
                renderItem: selectedListRenderer,
              },
              {
                renderItem: selectionButtonRenderer,
              },
            ],
          },
        ]}
      />
    </EuiPopover>
  );
}
