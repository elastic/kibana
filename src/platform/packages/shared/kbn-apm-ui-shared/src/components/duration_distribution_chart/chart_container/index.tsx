/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiFlexGroup, EuiFlexItem, EuiLoadingChart, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';

export interface ChartContainerProps {
  hasData: boolean;
  loading: boolean;
  hasError: boolean;
  height: number;
  children: React.ReactNode;
  id?: string;
}

export function ChartContainer({
  children,
  height,
  hasData,
  id,
  loading,
  hasError,
}: ChartContainerProps) {
  if (!hasData && loading) {
    return <LoadingChartPlaceholder height={height} />;
  }

  if (hasError && !loading) {
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
    <EuiFlexGroup
      css={{
        height,
      }}
      justifyContent="center"
      alignItems="center"
    >
      <EuiFlexItem grow={false}>
        <EuiLoadingChart data-test-subj="loading" size={'xl'} />
      </EuiFlexItem>
    </EuiFlexGroup>
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
