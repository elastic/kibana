/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiText } from '@elastic/eui';
import React, { useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { JsonValue } from '@kbn/utility-types';
import type { WorkflowStepExecutionDto } from '@kbn/workflows';
import { ExecutionDataViewer } from '../../../shared/ui/execution_data_viewer';

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
    const { data, title } = useMemo<{ data: JsonValue | undefined; title: string }>(() => {
      if (mode === 'input') {
        return { data: stepExecution.input, title: Titles.input };
      } else {
        if (stepExecution.error) {
          return {
            data: { error: stepExecution.error as unknown as JsonValue },
            title: Titles.error,
          };
        }
        return { data: stepExecution.output, title: Titles.output };
      }
    }, [mode, stepExecution]);

    const fieldPathActionsPrefix: string | undefined = useMemo(() => {
      const isOverviewStep = stepExecution.stepType === '__overview';
      const isTriggerStep = stepExecution.stepType?.startsWith('trigger_');
      const triggerType = isTriggerStep
        ? stepExecution.stepType?.replace('trigger_', '')
        : undefined;

      if (isOverviewStep) {
        return ''; // overview context: paths like "<fieldPath>"
      }

      if (!isTriggerStep) {
        if (mode !== 'output' || stepExecution.error) {
          return undefined; // Make field path actions available only for non-error output data.
        }
        return `steps.${stepExecution.stepId}.${mode}`;
      }

      if (mode === 'output') {
        return ''; // trigger context: paths like "<fieldPath>"
      }

      if (triggerType === 'manual') {
        return 'inputs'; // manual input: "inputs.<fieldPath>"
      }

      return 'event'; // alert/scheduled input: "event.<fieldPath>"
    }, [mode, stepExecution.stepId, stepExecution.error, stepExecution.stepType]);

    if (data === undefined) {
      return (
        <EuiText color="subdued" size="xs">
          <FormattedMessage
            id="workflowsManagement.stepExecutionDataView.noData"
            defaultMessage="No {mode} data"
            values={{ mode: Titles[mode].toLowerCase() }}
          />
        </EuiText>
      );
    }

    return (
      <ExecutionDataViewer
        data={data}
        title={title}
        fieldPathActionsPrefix={fieldPathActionsPrefix}
      />
    );
  }
);

StepExecutionDataView.displayName = 'StepExecutionDataView';
