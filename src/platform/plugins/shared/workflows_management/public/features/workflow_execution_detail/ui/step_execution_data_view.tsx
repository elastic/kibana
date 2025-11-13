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
import { Markdown } from '@kbn/kibana-react-plugin/public';
import type { JsonValue } from '@kbn/utility-types';
import type { WorkflowStepExecutionDto } from '@kbn/workflows';
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
    const { data, title } = useMemo<{ data: JsonValue | undefined; title: string }>(() => {
      if (mode === 'input') {
        return { data: stepExecution.input, title: Titles.input };
      } else {
        if (stepExecution.error) {
          return { data: { error: stepExecution.error }, title: Titles.error };
        }
        return { data: stepExecution.output, title: Titles.output };
      }
    }, [mode, stepExecution]);

    const fieldPathActionsPrefix: string | undefined = useMemo(() => {
      if (mode !== 'output' || stepExecution.error) {
        return undefined; // Make field path actions available only for output data and not error.
      }
      return `steps.${stepExecution.stepId}.${mode}`;
    }, [mode, stepExecution.stepId, stepExecution.error]);

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

    // Check if the data is a markdown string (common patterns: starts with #, contains markdown syntax)
    const isMarkdown = useMemo(() => {
      if (typeof data === 'string') {
        const trimmed = data.trim();
        // Check for common markdown patterns
        return (
          trimmed.startsWith('#') ||
          (trimmed.includes('##') && trimmed.includes('**')) ||
          (trimmed.includes('[') && trimmed.includes('](')) ||
          trimmed.includes('\n##') ||
          trimmed.includes('\n###')
        );
      }
      return false;
    }, [data]);

    // If it's markdown, render it with the Markdown component
    if (isMarkdown && typeof data === 'string') {
      // Replace literal \n with actual newlines if present
      const processedMarkdown = data.replace(/\\n/g, '\n');
      return (
        <div style={{ padding: '16px' }}>
          <Markdown markdown={processedMarkdown} openLinksInNewTab={true} />
        </div>
      );
    }

    return (
      <JSONDataView data={data} title={title} fieldPathActionsPrefix={fieldPathActionsPrefix} />
    );
  }
);

StepExecutionDataView.displayName = 'StepExecutionDataView';
