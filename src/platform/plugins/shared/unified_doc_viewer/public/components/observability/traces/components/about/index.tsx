/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { type DataTableRecord } from '@kbn/discover-utils';
import type { DocViewRenderProps } from '@kbn/unified-doc-viewer/types';
import {
  AT_TIMESTAMP,
  HTTP_RESPONSE_STATUS_CODE,
  SERVICE_NAME,
  SPAN_DESTINATION_SERVICE_RESOURCE,
  SPAN_DURATION,
  SPAN_ID,
  SPAN_NAME,
  SPAN_SUBTYPE,
  SPAN_TYPE,
  TRANSACTION_DURATION,
  TRANSACTION_ID,
  TRANSACTION_NAME,
  USER_AGENT_NAME,
  USER_AGENT_VERSION,
} from '@kbn/apm-types';
import { EuiPanel, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { ContentFrameworkTable } from '../../../../content_framework';
import { isTransaction } from '../../helpers';
import {
  sharedFieldConfigurations,
  spanFieldConfigurations,
  transactionFieldConfigurations,
} from './field_configurations';

const spanFieldNames = [
  SPAN_ID,
  SPAN_NAME,
  SERVICE_NAME,
  SPAN_DURATION,
  SPAN_DESTINATION_SERVICE_RESOURCE,
  AT_TIMESTAMP,
  HTTP_RESPONSE_STATUS_CODE,
  SPAN_TYPE,
  SPAN_SUBTYPE,
];

const transactionFieldNames = [
  TRANSACTION_ID,
  TRANSACTION_NAME,
  SERVICE_NAME,
  TRANSACTION_DURATION,
  AT_TIMESTAMP,
  HTTP_RESPONSE_STATUS_CODE,
  USER_AGENT_NAME,
  USER_AGENT_VERSION,
];

export interface AboutProps
  extends Pick<DocViewRenderProps, 'filter' | 'onAddColumn' | 'onRemoveColumn'> {
  hit: DataTableRecord;
  dataView: DocViewRenderProps['dataView'];
}

export const About = ({ hit, dataView, filter, onAddColumn, onRemoveColumn }: AboutProps) => {
  const { euiTheme } = useEuiTheme();
  const isSpan = !isTransaction(hit);

  const aboutFieldConfigurations = {
    ...sharedFieldConfigurations,
    ...(isSpan ? spanFieldConfigurations : transactionFieldConfigurations),
  };

  return (
    <EuiPanel hasBorder={true} hasShadow={false} paddingSize="s">
      <div
        css={css`
          margin-top: calc(${euiTheme.base * -1.5}px);
          // margin-bottom: calc(${euiTheme.base * -3}px);
        `}
      >
        <ContentFrameworkTable
          fieldNames={isSpan ? spanFieldNames : transactionFieldNames}
          id={'aboutTable'}
          fieldConfigurations={aboutFieldConfigurations}
          dataView={dataView}
          hit={hit}
          filter={filter}
          onAddColumn={onAddColumn}
          onRemoveColumn={onRemoveColumn}
        />
      </div>
    </EuiPanel>
  );
};
