/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useState, type ComponentProps } from 'react';
import {
  EuiButtonEmpty,
  EuiContextMenu,
  EuiDragDropContext,
  EuiDraggable,
  EuiDroppable,
  EuiToken,
  EuiFlexItem,
  EuiFlexGroup,
  EuiListGroup,
  EuiPopover,
  EuiPopoverFooter,
  EuiText,
  euiDragDropReorder,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useDataCascadeState, useDataCascadeDispatch } from '../../data_cascade_provider';

interface SelectionDropdownProps {
  onSelectionChange?: (groupByColumn: string[]) => void;
}

export function SelectionDropdown({ onSelectionChange }: SelectionDropdownProps) {
  const [isPopoverOpen, setPopover] = useState(false);
  const [availableColumnsIsOpen, setAvailableColumnsIsOpen] = useState(false);
  const { groupByColumns, currentGroupByColumns } = useDataCascadeState();
  const dispatch = useDataCascadeDispatch();

  const persistGroupByColumnSelection = useCallback(
    (groupByColumn: string[]) => {
      dispatch({ type: 'SET_ACTIVE_CASCADE_GROUPS', payload: groupByColumn });
      onSelectionChange?.(groupByColumn);
    },
    [dispatch, onSelectionChange]
  );

  const onButtonClick = () => {
    setPopover(!isPopoverOpen);
  };

  const closePopover = () => {
    setPopover(false);
  };

  const onGroupByColumnSelection = (groupByColumn: string) => {
    persistGroupByColumnSelection([...currentGroupByColumns, groupByColumn]);
    closePopover();
  };

  const clearSelectedGroupByColumn = () => {
    dispatch({ type: 'RESET_ACTIVE_CASCADE_GROUPS' });
  };

  const onDragEnd = useCallback<ComponentProps<typeof EuiDragDropContext>['onDragEnd']>(
    ({ source, destination }) => {
      if (source && destination) {
        const items = euiDragDropReorder(currentGroupByColumns, source.index, destination.index);

        persistGroupByColumnSelection(items);
      }
    },
    [currentGroupByColumns, persistGroupByColumnSelection]
  );

  const button = (
    <EuiButtonEmpty iconType={'inspect'} onClick={onButtonClick}>
      {i18n.translate('sharedUXPackages.data_cascade.selection_dropdown.selection_message', {
        defaultMessage: 'Group By: {groupedColumnsCount} groups selected',
        values: { groupedColumnsCount: currentGroupByColumns.length },
      })}
    </EuiButtonEmpty>
  );

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
                renderItem: () => {
                  return currentGroupByColumns.length ? (
                    <EuiDragDropContext onDragEnd={onDragEnd}>
                      <EuiDroppable droppableId="data-cascade-grouping">
                        {currentGroupByColumns.map((groupColumn, idx) => (
                          <EuiDraggable
                            draggableId={`data-cascade-grouping-${groupColumn}`}
                            index={idx}
                            key={groupColumn}
                            spacing="m"
                          >
                            {(provided) => (
                              <EuiFlexItem
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                data-test-subj={`DataCascadeColumnSelection-${groupColumn}`}
                              >
                                <EuiFlexGroup alignItems="center" gutterSize="s">
                                  <EuiToken iconType="tokenString" />
                                  <EuiText size="s">{groupColumn}</EuiText>
                                </EuiFlexGroup>
                              </EuiFlexItem>
                            )}
                          </EuiDraggable>
                        ))}
                      </EuiDroppable>
                    </EuiDragDropContext>
                  ) : (
                    <EuiText>
                      {i18n.translate(
                        'sharedUXPackages.data_cascade.selection_dropdown.no_selection_message',
                        { defaultMessage: 'No selection' }
                      )}
                    </EuiText>
                  );
                },
              },
              {
                renderItem: () => {
                  const availableColumnsForSelection = groupByColumns?.filter(
                    (groupByColumn) => currentGroupByColumns.indexOf(groupByColumn) === -1
                  );

                  return (
                    <EuiPopoverFooter paddingSize="s">
                      <EuiFlexGroup
                        direction="row"
                        justifyContent="spaceBetween"
                        responsive={false}
                      >
                        <EuiFlexItem grow={false}>
                          <EuiPopover
                            panelPaddingSize="xs"
                            isOpen={availableColumnsIsOpen}
                            onClick={() => setAvailableColumnsIsOpen(!availableColumnsIsOpen)}
                            closePopover={() => setAvailableColumnsIsOpen(false)}
                            button={
                              <EuiButtonEmpty
                                size="xs"
                                flush="left"
                                iconType="arrowDown"
                                iconSide="right"
                                disabled={!availableColumnsForSelection?.length}
                              >
                                {i18n.translate(
                                  'sharedUXPackages.data_cascade.selection_dropdown.available_selection_btn_text',
                                  { defaultMessage: 'Pick items to groupBy' }
                                )}
                              </EuiButtonEmpty>
                            }
                          >
                            <EuiListGroup
                              flush={true}
                              maxWidth={false}
                              listItems={availableColumnsForSelection?.map((groupColumn) => ({
                                label: <EuiText size="s">{groupColumn}</EuiText>,
                                icon: <EuiToken iconType="tokenString" />,
                                onClick: onGroupByColumnSelection.bind(null, groupColumn),
                                'data-test-subj': `DataCascadeColumnSelectionPopover-${groupColumn}`,
                              }))}
                            />
                          </EuiPopover>
                        </EuiFlexItem>
                        {Boolean(currentGroupByColumns.length) && (
                          <EuiFlexItem grow={false}>
                            <EuiButtonEmpty
                              onClick={clearSelectedGroupByColumn}
                              size="xs"
                              flush="right"
                            >
                              {i18n.translate(
                                'sharedUXPackages.data_cascade.selection_dropdown.clear_selection_btn_text',
                                { defaultMessage: 'Clear selection' }
                              )}
                            </EuiButtonEmpty>
                          </EuiFlexItem>
                        )}
                      </EuiFlexGroup>
                    </EuiPopoverFooter>
                  );
                },
              },
            ],
          },
        ]}
      />
    </EuiPopover>
  );
}
