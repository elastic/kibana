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
import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { JSONDataView, type JSONDataViewProps } from '../../../shared/ui/json_data_view';

interface StepExecutionDataViewProps extends JSONDataViewProps {
  data: Record<string, unknown> | null | undefined;
}

export const StepExecutionDataView = ({ title, data, ...props }: StepExecutionDataViewProps) => {
  const { euiTheme } = useEuiTheme();
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
  return <JSONDataView data={data} title={title} {...props} />;
};
