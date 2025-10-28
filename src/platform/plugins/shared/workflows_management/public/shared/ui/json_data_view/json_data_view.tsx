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
import type { JsonArray, JsonObject, JsonValue } from '@kbn/utility-types';
import { JsonDataCode } from './json_data_code';
import { JSONDataTable } from './json_data_table';

const SearchTermStorageKey = 'workflows_management.step_execution.searchTerm';

const ViewModeOptions: EuiButtonGroupOptionProps[] = [
  {
    id: 'table',
    label: i18n.translate('workflows.jsonDataTable.viewMode.table', {
      defaultMessage: 'Table',
    }),
    iconType: 'tableDensityNormal',
  },
  {
    id: 'json',
    label: i18n.translate('workflows.jsonDataTable.viewMode.json', {
      defaultMessage: 'JSON',
    }),
    iconType: 'code',
  },
];
const TableDisabledTooltip = i18n.translate(
  'workflows.jsonDataTable.viewMode.tableDisabledTooltip',
  { defaultMessage: 'Primitive data cannot be rendered in a table view' }
);

export interface JSONDataViewProps {
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

export const JSONDataView = React.memo<JSONDataViewProps>(
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

    // This prevents data from being displayed as a table if it is not tabular.
    const tabularData = useMemo<JsonArray | JsonObject | undefined>(() => {
      if (data == null) {
        return undefined;
      }
      if (Array.isArray(data) || typeof data === 'object') {
        return data;
      }
      return undefined; // Data cannot be displayed as a table, so return undefined.
    }, [data]);

    const viewModeOptions = useMemo<EuiButtonGroupOptionProps[]>(() => {
      if (tabularData) {
        return ViewModeOptions;
      }
      // Data cannot be displayed as a table, so disable the table view mode and show a tooltip.
      return ViewModeOptions.map<EuiButtonGroupOptionProps>((option) => ({
        ...option,
        ...(option.id === 'table' && { disabled: true, toolTipContent: TableDisabledTooltip }),
      }));
    }, [tabularData]);

    const viewMode = useMemo(() => {
      if (selectedViewMode === 'table' && tabularData) {
        return 'table';
      }
      return 'json';
    }, [selectedViewMode, tabularData]);

    return (
      <EuiFlexGroup
        data-test-subj={'jsonDataTable'}
        direction="column"
        gutterSize="none"
        responsive={false}
        style={{ height: '100%' }}
      >
        <EuiFlexItem grow={false}>
          <EuiFlexGroup responsive={false} gutterSize="s">
            {viewMode === 'table' && (
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
                idSelected={viewMode}
                legend={i18n.translate('workflows.jsonDataTable.viewMode', {
                  defaultMessage: 'View mode',
                })}
                onChange={handleViewModeChange}
                options={viewModeOptions}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>

        <EuiFlexItem grow={true}>
          <EuiSpacer size="s" />
          {viewMode === 'table' && tabularData && (
            <JSONDataTable
              data={tabularData}
              title={title}
              searchTerm={searchTerm}
              fieldPathActionsPrefix={fieldPathActionsPrefix}
            />
          )}
          {viewMode === 'json' && <JsonDataCode json={data} />}
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }
);
JSONDataView.displayName = 'JSONDataView';
