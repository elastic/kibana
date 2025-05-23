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
import { useDataPoolerState, useDataPoolerDispatch } from '../lib/store';

export function SelectionDropdown({}) {
  const [isPopoverOpen, setPopover] = useState(false);
  const [availableColumnsIsOpen, setAvailableColumnsIsOpen] = useState(false);
  const { groupByColumns, currentGroupByColumn } = useDataPoolerState();
  const dispatch = useDataPoolerDispatch();

  const onButtonClick = () => {
    setPopover(!isPopoverOpen);
  };

  const closePopover = () => {
    setPopover(false);
  };

  const onGroupByColumnSelection = (groupByColumn: string) => {
    dispatch({ type: 'SET_GROUP_BY_COLUMN', payload: groupByColumn });
    closePopover();
  };

  const button = (
    <EuiButtonEmpty iconType={'inspect'} onClick={onButtonClick}>
      {i18n.translate('sharedUXPackages.data_pooler.selection_dropdown.selection_message', {
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
      data-test-subj="DataPoolerColumnSelectionPopover"
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
                        'data-test-subj': `DataPoolerColumnSelectedAnchor-${groupColumn}`,
                      }))}
                    />
                  ) : (
                    <EuiText>
                      {i18n.translate(
                        'sharedUXPackages.data_pooler.selection_dropdown.no_selection_message',
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
                                  'sharedUXPackages.data_pooler.selection_dropdown.available_selection_btn_text',
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
                                'data-test-subj': `DataPoolerColumnSelectionPopover-${groupColumn}`,
                              }))}
                            />
                          </EuiPopover>
                        </EuiFlexItem>
                        {currentGroupByColumn && (
                          <EuiFlexItem grow={false}>
                            <EuiButtonEmpty size="xs" flush="right">
                              {i18n.translate(
                                'sharedUXPackages.data_pooler.selection_dropdown.clear_selection_btn_text',
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
