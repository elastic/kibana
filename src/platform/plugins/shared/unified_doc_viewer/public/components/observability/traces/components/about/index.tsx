/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useMemo } from 'react';
import { getFlattenedTraceDocumentOverview, type DataTableRecord } from '@kbn/discover-utils';
import type { DocViewRenderProps } from '@kbn/unified-doc-viewer/types';
import {
  AT_TIMESTAMP,
  DURATION,
  HTTP_RESPONSE_STATUS_CODE,
  SERVICE_NAME,
  SPAN_DESTINATION_SERVICE_RESOURCE,
  SPAN_DURATION,
  SPAN_ID,
  SPAN_NAME,
  SPAN_SUBTYPE,
  SPAN_TYPE,
  TRACE_ID,
  TRANSACTION_DURATION,
  TRANSACTION_ID,
  TRANSACTION_NAME,
  USER_AGENT_NAME,
  USER_AGENT_VERSION,
} from '@kbn/apm-types';
import { EuiPanel, useEuiTheme } from '@elastic/eui';
import { Duration } from '@kbn/apm-ui-shared';
import { css } from '@emotion/react';
import { ContentFrameworkTable } from '../../../../content_framework';
import { isTransaction } from '../../helpers';
import {
  getSharedFieldConfigurations,
  getSpanFieldConfigurations,
  getTransactionFieldConfigurations,
} from './field_configurations';
import { useFetchTraceRootSpanContext } from '../../doc_viewer_overview/hooks/use_fetch_trace_root_span';

const spanFieldNames = [
  SPAN_ID,
  SPAN_NAME,
  TRACE_ID,
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
  TRACE_ID,
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
  const flattenedHit = getFlattenedTraceDocumentOverview(hit);
  const traceRootSpan = useFetchTraceRootSpanContext();

  const aboutFieldConfigurations = useMemo(
    () => ({
      ...getSharedFieldConfigurations(flattenedHit),
      ...(isSpan
        ? getSpanFieldConfigurations(flattenedHit)
        : getTransactionFieldConfigurations(flattenedHit)),
    }),
    [flattenedHit, isSpan]
  );

  const durationField = isSpan ? SPAN_DURATION ?? DURATION : TRANSACTION_DURATION;

  aboutFieldConfigurations[durationField] = {
    ...aboutFieldConfigurations[durationField],
    formatter: (value: unknown) => (
      <Duration
        duration={value as number}
        size="xs"
        parent={{
          duration: traceRootSpan?.span?.duration,
          type: 'trace',
        }}
      />
    ),
  };

  return (
    <EuiPanel
      hasBorder={true}
      hasShadow={false}
      paddingSize="s"
      css={css`
        padding-bottom: ${euiTheme.base / 4}px;
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
    </EuiPanel>
  );
};
