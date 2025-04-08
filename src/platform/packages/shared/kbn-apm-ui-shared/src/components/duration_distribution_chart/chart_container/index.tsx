/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiLoadingChart, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { FETCH_STATUS, isPending } from '../../../enums';

export interface ChartContainerProps {
  hasData: boolean;
  status: FETCH_STATUS;
  height: number;
  children: React.ReactNode;
  id?: string;
}

export function ChartContainer({ children, height, status, hasData, id }: ChartContainerProps) {
  if (!hasData && isPending(status)) {
    return <LoadingChartPlaceholder height={height} />;
  }

  if (status === FETCH_STATUS.FAILURE) {
    return <FailedChartPlaceholder height={height} />;
  }

  return (
    <div style={{ height }} data-test-subj={id}>
      {children}
    </div>
  );
}

function LoadingChartPlaceholder({ height }: { height: number }) {
  return (
    <div
      style={{
        height,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <EuiLoadingChart data-test-subj="loading" size={'xl'} />
    </div>
  );
}

function FailedChartPlaceholder({ height }: { height: number }) {
  return (
    <EuiText color="subdued" css={{ height }}>
      {i18n.translate('kbnApmUiShared.chartContainerchart.error', {
        defaultMessage: 'An error happened when trying to fetch data. Please try again',
      })}
    </EuiText>
  );
}
