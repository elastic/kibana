/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useState } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiPopover, EuiButtonEmpty, EuiSelectable } from '@elastic/eui';
import type { DataCascadeProps } from '@kbn/shared-ux-document-data-cascade';
import type { DataTableRecord } from '@kbn/discover-utils';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  useCurrentTabSelector,
  internalStateActions,
  useInternalStateDispatch,
  useCurrentTabAction,
} from '../../../../state_management/redux';

type ESQLDataGroupNode = DataTableRecord['flattened'] & { id: string };

interface UseTableHeaderProps {
  viewModeToggle: React.ReactNode;
}

export function useEsqlDataCascadeHeaderComponent({ viewModeToggle }: UseTableHeaderProps) {
  const layoutUiState = useCurrentTabSelector((state) => state.uiState.layout);
  const setLayoutUiState = useCurrentTabAction(internalStateActions.setLayoutUiState);
  const dispatch = useInternalStateDispatch();

  const [cascadeSelectOpen, setCascadeSelectOpen] = useState(false);

  const disableCascadeSupport = useCallback(() => {
    dispatch(
      setLayoutUiState({
        layoutUiState: {
          ...layoutUiState,
          supportsCascade: false,
        },
      })
    );
  }, [dispatch, layoutUiState, setLayoutUiState]);

  return useCallback<
    NonNullable<DataCascadeProps<ESQLDataGroupNode, DataTableRecord>['customTableHeader']>
  >(
    ({ currentSelectedColumns, availableColumns, onGroupSelection }) => {
      return (
        <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
          <EuiFlexItem>{viewModeToggle}</EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiPopover
              isOpen={cascadeSelectOpen}
              closePopover={() => setCascadeSelectOpen(false)}
              panelPaddingSize="none"
              button={
                <EuiButtonEmpty
                  aria-label="Change grouping"
                  size="s"
                  iconType="inspect"
                  flush="both"
                  onClick={() => setCascadeSelectOpen(true)}
                >
                  <FormattedMessage
                    id="discover.esql_data_cascade.change_grouping.button_label"
                    defaultMessage="Grouped by: {selectedGroup}"
                    values={{ selectedGroup: currentSelectedColumns[0] }}
                  />
                </EuiButtonEmpty>
              }
            >
              <EuiSelectable
                searchable={false}
                listProps={{
                  isVirtualized: false,
                }}
                options={['none'].concat(availableColumns).map((field) => ({
                  label: field,
                  checked: currentSelectedColumns.includes(field) ? 'on' : undefined,
                }))}
                singleSelection="always"
                onActiveOptionChange={(option) => {
                  if (option) {
                    if (option.label === 'none') {
                      disableCascadeSupport();
                    } else {
                      onGroupSelection([option.label]);
                    }
                  }

                  setCascadeSelectOpen(false);
                }}
              >
                {(list) => <div style={{ width: 300 }}>{list}</div>}
              </EuiSelectable>
            </EuiPopover>
          </EuiFlexItem>
        </EuiFlexGroup>
      );
    },
    [cascadeSelectOpen, disableCascadeSupport, viewModeToggle]
  );
}
