/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EuiButtonGroupOptionProps } from '@elastic/eui';
import { EuiButtonGroup, EuiFieldSearch, EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';
import { debounce } from 'lodash';
import React, { useCallback, useMemo, useState } from 'react';
import useLocalStorage from 'react-use/lib/useLocalStorage';
import { i18n } from '@kbn/i18n';
import type { JsonValue } from '@kbn/utility-types';
import { JsonDataCode } from './json_data_code';
import { JSONDataTable } from './json_data_table';

const SearchTermStorageKey = 'workflows_management.step_execution.searchTerm';

const ViewModeOptions: EuiButtonGroupOptionProps[] = [
  {
    id: 'table',
    'data-test-subj': 'workflowViewMode_table',
    label: i18n.translate('workflows.jsonDataTable.viewMode.table', {
      defaultMessage: 'Table',
    }),
    iconType: 'tableDensityNormal',
  },
  {
    id: 'json',
    'data-test-subj': 'workflowViewMode_json',
    label: i18n.translate('workflows.jsonDataTable.viewMode.json', {
      defaultMessage: 'JSON',
    }),
    iconType: 'code',
  },
];

export interface ExecutionDataViewerProps {
  /**
   * The JSON data to display. Can be a single object, an array of objects, or any serializable value.
   * If an array is provided, only the first object will be displayed.
   * If a primitive value is provided, it will be wrapped in an object.
   */
  data: JsonValue;
  /** Optional title for the data view. Defaults to 'JSON Data' */
  title?: string;
  /** Optional prefix for the field path actions, such as the copy the field path to the clipboard. */
  fieldPathActionsPrefix?: string;
}

export const ExecutionDataViewer = React.memo<ExecutionDataViewerProps>(
  ({ data, title, fieldPathActionsPrefix }) => {
    const [selectedViewMode, setSelectedViewMode] = useState<'table' | 'json'>('table');

    const [storedSearchTerm, setStoredSearchTerm] = useLocalStorage(SearchTermStorageKey, '');
    const [searchTerm, setSearchTerm] = useState(storedSearchTerm ?? '');

    const setStoredSearchTermDebounced = useMemo(
      () => debounce(setStoredSearchTerm, 500),
      [setStoredSearchTerm]
    );

    const handleViewModeChange = useCallback((id: string) => {
      setSelectedViewMode(id as 'table' | 'json');
    }, []);

    const handleSearchTermChange = useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        const { value } = e.target;
        setSearchTerm(value);
        setStoredSearchTermDebounced(value);
      },
      [setStoredSearchTermDebounced]
    );

    return (
      <EuiFlexGroup
        data-test-subj="workflowJsonDataViewer"
        direction="column"
        gutterSize="none"
        responsive={false}
        style={{ height: '100%' }}
      >
        <EuiFlexItem grow={false}>
          <EuiFlexGroup responsive={false} gutterSize="s">
            {selectedViewMode === 'table' && (
              <EuiFlexItem>
                <EuiFieldSearch
                  compressed
                  fullWidth
                  placeholder="Filter by field, value"
                  value={searchTerm}
                  onChange={handleSearchTermChange}
                  isClearable
                  aria-label={i18n.translate('workflows.jsonDataTable.searchAriaLabel', {
                    defaultMessage: 'Search fields and values',
                  })}
                />
              </EuiFlexItem>
            )}
            <EuiFlexItem
              grow={false}
              css={{
                justifySelf: 'flex-end',
                marginLeft: 'auto',
              }}
            >
              <EuiButtonGroup
                isIconOnly
                buttonSize="compressed"
                color="primary"
                type="single"
                idSelected={selectedViewMode}
                legend={i18n.translate('workflows.jsonDataTable.viewMode', {
                  defaultMessage: 'View mode',
                })}
                onChange={handleViewModeChange}
                options={ViewModeOptions}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>

        <EuiFlexItem grow={true} css={{ overflow: 'hidden', minHeight: 0 }}>
          <EuiSpacer size="s" />
          {selectedViewMode === 'table' && data && (
            <JSONDataTable
              data={data}
              title={title}
              searchTerm={searchTerm}
              fieldPathActionsPrefix={fieldPathActionsPrefix}
            />
          )}
          {selectedViewMode === 'json' && <JsonDataCode json={data} />}
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }
);
ExecutionDataViewer.displayName = 'ExecutionDataViewer';
