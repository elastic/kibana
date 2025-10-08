/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useMemo, useState } from 'react';
import { EuiFlexItem, EuiFlexGroup, EuiButtonGroup, EuiSpacer, EuiFieldSearch } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { JsonDataCode } from './json_data_code';
import { JSONDataTable } from './json_data_table';

export interface JSONDataViewProps {
  /**
   * The JSON data to display. Can be a single object, an array of objects, or any serializable value.
   * If an array is provided, only the first object will be displayed.
   * If a primitive value is provided, it will be wrapped in an object.
   */
  data: Record<string, unknown> | Record<string, unknown>[] | unknown;

  /**
   * Optional title for the data view. Defaults to 'JSON Data'
   */
  title?: string;

  /**
   * Optional columns to display. If not provided, all keys from the data will be used.
   */
  columns?: string[];

  /**
   * Optional search term to filter the data.
   */
  searchTerm?: string;

  /**
   * Optional function to set the search term.
   */
  onSearchTermChange?: (value: string) => void;

  /**
   * Test subject for testing purposes
   */
  'data-test-subj'?: string;
}

export function JSONDataView({
  data,
  title = 'JSON Data',
  columns,
  searchTerm,
  onSearchTermChange,
  'data-test-subj': dataTestSubj = 'jsonDataTable',
}: JSONDataViewProps) {
  const [viewMode, setViewMode] = useState<'table' | 'json'>('table');

  // Convert data to object format if needed
  const jsonObject = useMemo(() => {
    if (Array.isArray(data)) {
      return data[0] || {};
    }

    // If data is already an object, use it directly
    if (data && typeof data === 'object' && data !== null) {
      return data as Record<string, unknown>;
    }

    // For primitive values, wrap them in an object
    if (data !== undefined && data !== null) {
      return { value: data };
    }

    return {};
  }, [data]);

  return (
    <EuiFlexGroup
      data-test-subj={dataTestSubj}
      direction="column"
      gutterSize="none"
      responsive={false}
      style={{ height: '100%' }}
    >
      <EuiFlexItem grow={false}>
        <EuiFlexGroup responsive={false} gutterSize="s">
          {viewMode === 'table' && onSearchTermChange && (
            <EuiFlexItem>
              <EuiFieldSearch
                compressed
                fullWidth
                placeholder="Filter by field, value"
                value={searchTerm}
                onChange={(e) => onSearchTermChange(e.target.value)}
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
              onChange={(id) => setViewMode(id as 'table' | 'json')}
              options={[
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
              ]}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>

      <EuiFlexItem grow={true}>
        <EuiSpacer size="s" />
        {viewMode === 'table' && (
          <JSONDataTable
            data={jsonObject}
            title={title}
            columns={columns}
            searchTerm={searchTerm}
          />
        )}
        {viewMode === 'json' && <JsonDataCode json={jsonObject} />}
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
