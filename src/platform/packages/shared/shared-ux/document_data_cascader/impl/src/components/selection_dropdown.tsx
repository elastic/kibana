/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useState } from 'react';
import {
  EuiButtonEmpty,
  EuiContextMenu,
  EuiToken,
  EuiFlexItem,
  EuiFlexGroup,
  EuiListGroup,
  EuiPopover,
  EuiPopoverFooter,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useDataCascadeState, useDataCascadeDispatch } from '../lib/store';

interface SelectionDropdownProps {
  onSelectionChange?: (groupByColumn: string) => void;
}

export function SelectionDropdown({ onSelectionChange }: SelectionDropdownProps) {
  const [isPopoverOpen, setPopover] = useState(false);
  const [availableColumnsIsOpen, setAvailableColumnsIsOpen] = useState(false);
  const { groupByColumns, currentGroupByColumn } = useDataCascadeState();
  const dispatch = useDataCascadeDispatch();

  const onButtonClick = () => {
    setPopover(!isPopoverOpen);
  };

  const closePopover = () => {
    setPopover(false);
  };

  const onGroupByColumnSelection = (groupByColumn: string) => {
    dispatch({ type: 'SET_GROUP_BY_COLUMN', payload: groupByColumn });
    onSelectionChange?.(groupByColumn);
    closePopover();
  };

  const clearSelectedGroupByColumn = () => {
    dispatch({ type: 'EMPTY_GROUP_BY_COLUMN_SELECTION', payload: '' });
  };

  const button = (
    <EuiButtonEmpty iconType={'inspect'} onClick={onButtonClick}>
      {i18n.translate('sharedUXPackages.data_cascade.selection_dropdown.selection_message', {
        defaultMessage: 'Group By: {groupByColumns} selected',
        values: { groupByColumns: currentGroupByColumn },
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
                  return currentGroupByColumn ? (
                    <EuiListGroup
                      flush={true}
                      listItems={[currentGroupByColumn].map((groupColumn) => ({
                        label: <EuiText>{groupColumn}</EuiText>,
                        icon: <EuiToken iconType="tokenString" />,
                        onClick: () => {},
                        'data-test-subj': `DataCascadeColumnSelectedAnchor-${groupColumn}`,
                      }))}
                    />
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
                    (groupByColumn) => currentGroupByColumn !== groupByColumn
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
                        {currentGroupByColumn && (
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
