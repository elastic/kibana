/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EuiEmptyPromptProps } from '@elastic/eui';
import { EuiEmptyPrompt, EuiIcon, useEuiTheme } from '@elastic/eui';
import React, { useCallback, useMemo, useState } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { debounce } from 'lodash';
import { JSONDataView, type JSONDataViewProps } from '../../../shared/ui/json_data_view';
import type { WorkflowsPluginStartAdditionalServices } from '../../../types';

export const STORAGE_KEY = 'workflows_management.step_execution_flyout.searchTerm';

interface StepExecutionDataViewProps extends JSONDataViewProps {
  data: Record<string, unknown> | null | undefined;
}

export const StepExecutionDataView = ({ title, data, ...props }: StepExecutionDataViewProps) => {
  const { euiTheme } = useEuiTheme();
  const { storage } = useKibana<WorkflowsPluginStartAdditionalServices>().services;

  const searchTermStorage = storage.get(STORAGE_KEY) || '';
  const [searchTerm, setSearchTerm] = useState(searchTermStorage);

  const setSearchTermStorage = useCallback(
    (value: string) => {
      storage.set(STORAGE_KEY, value);
    },
    [storage]
  );
  const setSearchTermStorageDebounced = useMemo(
    () => debounce(setSearchTermStorage, 500),
    [setSearchTermStorage]
  );

  const handleSearchTermChange = (value: string) => {
    setSearchTerm(value);
    setSearchTermStorageDebounced(value);
  };

  const containerCss = {
    padding: euiTheme.size.s,
  };
  const emptyPromptCommonProps: EuiEmptyPromptProps = {
    titleSize: 's',
    paddingSize: 's',
  };
  if (!data) {
    return (
      <EuiEmptyPrompt
        {...emptyPromptCommonProps}
        css={containerCss}
        icon={<EuiIcon type="info" size="l" />}
        title={
          <h2>
            <FormattedMessage
              id="workflows.stepExecutionDataTable.noDataFound"
              defaultMessage="No {title} found"
              values={{ title: title?.toLowerCase() ?? 'data' }}
            />
          </h2>
        }
      />
    );
  }
  return (
    <JSONDataView
      data={data}
      title={title}
      searchTerm={searchTerm}
      onSearchTermChange={handleSearchTermChange}
      {...props}
    />
  );
};
