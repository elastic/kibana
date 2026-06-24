/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EuiSelectOption } from '@elastic/eui';
import { EuiAccordion, EuiPanel, EuiSelect, EuiText } from '@elastic/eui';
import React, { useCallback, useState } from 'react';
import { i18n } from '@kbn/i18n';
import type { JsonValue } from '@kbn/utility-types';
import { JsonDataCode } from './json_data_code';
import { JSONDataTable } from './json_data_table';

const viewModeOptions: EuiSelectOption[] = [
  {
    value: 'table',
    text: i18n.translate('workflows.jsonDataTable.viewMode.table', { defaultMessage: 'Table' }),
  },
  {
    value: 'json',
    text: i18n.translate('workflows.jsonDataTable.viewMode.json', { defaultMessage: 'JSON' }),
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

    const handleViewModeChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
      setSelectedViewMode(e.target.value as 'table' | 'json');
    }, []);

    return (
      <EuiAccordion
        id={`execution-data-viewer-${title ?? 'data'}`}
        data-test-subj="workflowJsonDataViewer"
        initialIsOpen={true}
        arrowDisplay="left"
        buttonContent={
          title ? (
            <EuiText size="s">
              <strong>{title}</strong>
            </EuiText>
          ) : undefined
        }
        extraAction={
          <EuiSelect
            compressed
            options={viewModeOptions}
            value={selectedViewMode}
            onChange={handleViewModeChange}
            aria-label={i18n.translate('workflows.jsonDataTable.viewMode', {
              defaultMessage: 'View mode',
            })}
            data-test-subj="workflowViewModeSelect"
          />
        }
      >
        <EuiPanel hasBorder paddingSize="none">
          {selectedViewMode === 'table' && data && (
            <JSONDataTable
              data={data}
              title={title}
              searchTerm=""
              fieldPathActionsPrefix={fieldPathActionsPrefix}
            />
          )}
          {selectedViewMode === 'json' && <JsonDataCode json={data} />}
        </EuiPanel>
      </EuiAccordion>
    );
  }
);
ExecutionDataViewer.displayName = 'ExecutionDataViewer';
