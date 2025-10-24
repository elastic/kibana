/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useMemo } from 'react';
import type { WorkflowStepExecutionDto } from '@kbn/workflows';
import { i18n } from '@kbn/i18n';
import { JSONDataView } from '../../../shared/ui/json_data_view';

const Titles = {
  output: i18n.translate('workflowsManagement.stepExecutionDataView.outputTitle', {
    defaultMessage: 'Output',
  }),
  error: i18n.translate('workflowsManagement.stepExecutionDataView.errorTitle', {
    defaultMessage: 'Error',
  }),
  input: i18n.translate('workflowsManagement.stepExecutionDataView.inputTitle', {
    defaultMessage: 'Input',
  }),
};

interface StepExecutionDataViewProps {
  stepExecution: WorkflowStepExecutionDto;
  mode: 'input' | 'output';
}

export const StepExecutionDataView = React.memo<StepExecutionDataViewProps>(
  ({ stepExecution, mode }) => {
    const { data, title } = useMemo(() => {
      if (mode === 'input') {
        return { data: stepExecution.input, title: Titles.input };
      } else {
        if (stepExecution.error) {
          return { data: { error: stepExecution.error }, title: Titles.error };
        }
        return { data: stepExecution.output, title: Titles.output };
      }
    }, [mode, stepExecution]);

    // Convert data to object format if needed
    const jsonObject = useMemo<Record<string, unknown>>(() => {
      if (Array.isArray(data)) {
        return data[0] || {};
      }
      // If data is already an object, use it directly
      if (data && typeof data === 'object') {
        return data;
      }
      if (data != null) {
        // For primitive values, wrap them in an object
        return { value: data };
      }
      return {};
    }, [data]);

    const fieldPathActionsPrefix: string | undefined = useMemo(() => {
      if (mode !== 'output' || stepExecution.error) {
        return undefined; // Make field path actions available only for output data and not error.
      }
      if (Array.isArray(data) && data.length > 0) {
        return `steps.${stepExecution.stepId}.${mode}[0]`; // jsonObject will be data[0]
      }
      return `steps.${stepExecution.stepId}.${mode}`;
    }, [data, mode, stepExecution.stepId, stepExecution.error]);

    return (
      <JSONDataView
        data={jsonObject}
        title={title}
        fieldPathActionsPrefix={fieldPathActionsPrefix}
      />
    );
  }
);
