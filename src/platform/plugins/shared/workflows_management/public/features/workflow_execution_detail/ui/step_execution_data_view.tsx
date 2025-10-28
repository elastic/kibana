/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useMemo, useState } from 'react';
import { debounce } from 'lodash';
import type { WorkflowStepExecutionDto } from '@kbn/workflows';
import { i18n } from '@kbn/i18n';
import { JSONDataView, type JSONDataViewProps } from '../../../shared/ui/json_data_view';
import { useKibana } from '../../../hooks/use_kibana';

export const STORAGE_KEY = 'workflows_management.step_execution_flyout.searchTerm';

const titles = {
  input: i18n.translate('workflowsManagement.stepExecutionDataView.inputTitle', {
    defaultMessage: 'Input',
  }),
  output: i18n.translate('workflowsManagement.stepExecutionDataView.outputTitle', {
    defaultMessage: 'Output',
  }),
  error: i18n.translate('workflowsManagement.stepExecutionDataView.errorTitle', {
    defaultMessage: 'Error',
  }),
};

interface StepExecutionDataViewProps extends Omit<JSONDataViewProps, 'data'> {
  stepExecution: WorkflowStepExecutionDto;
  mode: 'input' | 'output';
}

export const StepExecutionDataView = ({
  stepExecution,
  mode,
  ...props
}: StepExecutionDataViewProps) => {
  const { storage } = useKibana().services;

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

  const { data, title } = useMemo(() => {
    if (mode === 'input') {
      return { data: stepExecution.input, title: titles.input };
    } else {
      if (stepExecution.error) {
        return { data: { error: stepExecution.error }, title: titles.error };
      }
      return { data: stepExecution.output, title: titles.output };
    }
  }, [mode, stepExecution]);

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
