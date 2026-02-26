/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ComponentProps } from 'react';
import React, { useCallback, useState, useMemo } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiPopover,
  EuiSelectable,
  EuiFilterGroup,
  EuiDataGridToolbarControl,
} from '@elastic/eui';
import type { DataCascadeProps } from '@kbn/shared-ux-document-data-cascade';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { styles as toolbarStyles } from '@kbn/unified-data-table/src/components/custom_toolbar/render_custom_toolbar';
import type { DataTableRecord } from '@kbn/discover-utils';
import type { ESQLDataGroupNode } from './types';

interface UseTableHeaderProps {
  viewModeToggle: React.ReactElement | undefined;
  cascadeGroupingChangeHandler: (cascadeGrouping: string[]) => void;
}

interface GroupBySelectorRendererProps {
  width?: number;
  cascadeGroupingChangeHandler: (cascadeGrouping: string[]) => void;
}

const NONE_GROUP_OPTION = 'none';

function CascadeGroupingSelectionPopover({
  availableColumns,
  currentSelectedColumns,
  cascadeGroupingChangeHandler,
  width = 300,
}: {
  availableColumns: string[];
  currentSelectedColumns: string[];
  cascadeGroupingChangeHandler: (cascadeGrouping: string[]) => void;
  width?: number;
}) {
  const [cascadeSelectOpen, setCascadeSelectOpen] = useState(false);

  const selectionOptions = useMemo(
    () =>
      [NONE_GROUP_OPTION].concat(availableColumns).map((field) => ({
        label: field,
        'data-test-subj':
          field === NONE_GROUP_OPTION
            ? 'discoverCascadeLayoutOptOutButton'
            : `${field}-cascadeLayoutOptionBtn`,
        checked:
          (field === NONE_GROUP_OPTION && !currentSelectedColumns.length) ||
          currentSelectedColumns.includes(field)
            ? ('on' as const)
            : undefined,
      })),
    [availableColumns, currentSelectedColumns]
  );

  const closeSelectionPopover = useCallback(() => {
    setCascadeSelectOpen(false);
  }, []);

  const toggleSelectionPopover = useCallback(() => {
    setCascadeSelectOpen((open) => !open);
  }, []);

  const onSelectionChange = useCallback<
    NonNullable<ComponentProps<typeof EuiSelectable>['onActiveOptionChange']>
  >(
    (option) => {
      if (option) {
        // we send an array of the selected columns, in the case of none we send an empty array
        cascadeGroupingChangeHandler([option.label].filter((o) => o !== NONE_GROUP_OPTION));
      }

      closeSelectionPopover();
    },
    [cascadeGroupingChangeHandler, closeSelectionPopover]
  );

  return (
    <EuiPopover
      isOpen={cascadeSelectOpen}
      closePopover={closeSelectionPopover}
      panelPaddingSize="none"
      button={
        <EuiFilterGroup css={toolbarStyles.controlButton}>
          <EuiDataGridToolbarControl
            iconType="inspect"
            color="text"
            onClick={toggleSelectionPopover}
            badgeContent={currentSelectedColumns.length}
            data-test-subj="discoverEnableCascadeLayoutSwitch"
          >
            <FormattedMessage
              id="discover.dataCascade.header.layoutSwitchLabel"
              defaultMessage="Group by"
            />
          </EuiDataGridToolbarControl>
        </EuiFilterGroup>
      }
    >
      <EuiSelectable
        searchable={false}
        listProps={{
          isVirtualized: false,
        }}
        data-test-subj="discoverGroupBySelectionList"
        options={selectionOptions}
        singleSelection="always"
        onActiveOptionChange={onSelectionChange}
      >
        {(list) => <div style={{ width }}>{list}</div>}
      </EuiSelectable>
    </EuiPopover>
  );
}

/**
 * Renders the "Group By" selector used in the data cascade header.
 */
export function useGetGroupBySelectorRenderer({
  cascadeGroupingChangeHandler,
}: GroupBySelectorRendererProps) {
  return useCallback(
    (availableColumns: string[], currentSelectedColumns: string[]) => {
      return (
        <CascadeGroupingSelectionPopover
          key="cascade-grouping-selection-popover"
          availableColumns={availableColumns}
          currentSelectedColumns={currentSelectedColumns}
          cascadeGroupingChangeHandler={cascadeGroupingChangeHandler}
        />
      );
    },
    [cascadeGroupingChangeHandler]
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
        <EuiFlexGroup
          justifyContent={viewModeToggle ? 'spaceBetween' : 'flexEnd'}
          alignItems="center"
          responsive={false}
        >
          {viewModeToggle && (
            <EuiFlexItem>
              {React.cloneElement(viewModeToggle!, {
                hitCounterLabel: i18n.translate('discover.dataCascade.header.resultLabel', {
                  defaultMessage: 'group',
                }),
                hitCounterPluralLabel: i18n.translate('discover.dataCascade.header.resultsLabel', {
                  defaultMessage: 'groups',
                }),
              })}
            </EuiFlexItem>
          )}
          <EuiFlexItem grow={false}>
            {groupBySelectorRenderer(availableColumns, currentSelectedColumns)}
          </EuiFlexItem>
        </EuiFlexGroup>
      );
    },
    [groupBySelectorRenderer, viewModeToggle]
  );
}
