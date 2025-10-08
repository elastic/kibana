/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useState } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiPopover,
  EuiSelectable,
  EuiFilterGroup,
  EuiFilterButton,
} from '@elastic/eui';
import type { DataCascadeProps } from '@kbn/shared-ux-document-data-cascade';
import { FormattedMessage } from '@kbn/i18n-react';
import type { ESQLDataGroupNode, DataTableRecord } from './types';

interface UseTableHeaderProps {
  viewModeToggle: React.ReactNode;
  cascadeGroupingChangeHandler: (cascadeGrouping: string[]) => void;
}

interface GroupBySelectorRendererProps {
  width?: number;
  cascadeGroupingChangeHandler: (cascadeGrouping: string[]) => void;
}

const NONE_GROUP_OPTION = 'none';

/**
 * Renders the "Group By" selector used in the data cascade header.
 */
export function useGetGroupBySelectorRenderer({
  cascadeGroupingChangeHandler,
  width = 300,
}: GroupBySelectorRendererProps) {
  const [cascadeSelectOpen, setCascadeSelectOpen] = useState(false);

  return useCallback(
    (availableColumns: string[], currentSelectedColumns: string[]) => (
      <EuiPopover
        isOpen={cascadeSelectOpen}
        closePopover={() => setCascadeSelectOpen(false)}
        panelPaddingSize="none"
        button={
          <EuiFilterGroup compressed>
            <EuiFilterButton
              iconSide="left"
              iconType="inspect"
              color="text"
              badgeColor="subdued"
              onClick={() => setCascadeSelectOpen(true)}
              hasActiveFilters={true}
              numFilters={currentSelectedColumns.length}
              data-test-subj="discoverEnableCascadeLayoutSwitch"
            >
              <FormattedMessage
                id="discover.enableCascadeLayoutSwitchLabel"
                defaultMessage="Group By"
              />
            </EuiFilterButton>
          </EuiFilterGroup>
        }
      >
        <EuiSelectable
          searchable={false}
          listProps={{
            isVirtualized: false,
          }}
          data-test-subj="discoverGroupBySelector"
          options={[NONE_GROUP_OPTION].concat(availableColumns).map((field) => ({
            label: field,
            checked:
              (field === NONE_GROUP_OPTION && !currentSelectedColumns.length) ||
              currentSelectedColumns.includes(field)
                ? 'on'
                : undefined,
          }))}
          singleSelection="always"
          onActiveOptionChange={(option) => {
            if (option) {
              cascadeGroupingChangeHandler([option.label].filter((o) => o !== NONE_GROUP_OPTION));
            }

            setCascadeSelectOpen(false);
          }}
        >
          {(list) => <div style={{ width }}>{list}</div>}
        </EuiSelectable>
      </EuiPopover>
    ),
    [cascadeSelectOpen, cascadeGroupingChangeHandler, width]
  );
}

export function useEsqlDataCascadeHeaderComponent({
  viewModeToggle,
  cascadeGroupingChangeHandler,
}: UseTableHeaderProps) {
  const groupBySelectorRenderer = useGetGroupBySelectorRenderer({
    cascadeGroupingChangeHandler,
  });

  return useCallback<
    NonNullable<DataCascadeProps<ESQLDataGroupNode, DataTableRecord>['customTableHeader']>
  >(
    ({ currentSelectedColumns, availableColumns }) => {
      return (
        <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
          <EuiFlexItem>{viewModeToggle}</EuiFlexItem>
          <EuiFlexItem grow={false}>
            {groupBySelectorRenderer(availableColumns, currentSelectedColumns)}
          </EuiFlexItem>
        </EuiFlexGroup>
      );
    },
    [groupBySelectorRenderer, viewModeToggle]
  );
}
