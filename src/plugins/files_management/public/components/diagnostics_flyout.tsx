/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { useQuery } from '@tanstack/react-query';
import {
  EuiFlyout,
  EuiFlyoutHeader,
  EuiFlyoutBody,
  EuiButton,
  EuiLoadingSpinner,
  EuiPanel,
  EuiTitle,
  EuiEmptyPrompt,
  EuiStat,
  EuiFlexGroup,
  EuiSpacer,
  EuiFlexItem,
} from '@elastic/eui';
import { Chart, Axis, Position, HistogramBarSeries, ScaleType } from '@elastic/charts';
import numeral from '@elastic/numeral';
import type { FunctionComponent } from 'react';
import React from 'react';
import { i18nTexts } from '../i18n_texts';
import { useFilesManagementContext } from '../context';

interface Props {
  onClose: () => void;
}

export const DiagnosticsFlyout: FunctionComponent<Props> = ({ onClose }) => {
  const { filesClient } = useFilesManagementContext();
  const { status, refetch, data, isLoading, error } = useQuery(['filesDiagnostics'], async () => {
    return filesClient.getMetrics();
  });

  return (
    <EuiFlyout ownFocus onClose={onClose} size="s">
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2>{i18nTexts.diagnosticsFlyoutTitle}</h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        {status === 'error' ? (
          <EuiEmptyPrompt
            titleSize="xs"
            title={<h3>{i18nTexts.failedToFetchDiagnostics}</h3>}
            body={(error as Error)?.message ?? ''}
            color="danger"
            actions={[
              <EuiButton isLoading={isLoading} color="danger" onClick={() => refetch()}>
                {i18nTexts.retry}
              </EuiButton>,
            ]}
          />
        ) : status === 'loading' ? (
          <EuiLoadingSpinner size="xl" />
        ) : (
          <>
            <EuiPanel hasBorder hasShadow={false}>
              <EuiTitle size="xs">
                <h3>{i18nTexts.diagnosticsFlyoutSummarySectionTitle}</h3>
              </EuiTitle>
              <EuiSpacer size="s" />
              <EuiFlexGroup gutterSize="none">
                <EuiFlexItem grow={1}>
                  <EuiStat
                    title={numeral(data.storage.esFixedSizeIndex.used).format('0[.]0 b')}
                    description={i18nTexts.diagnosticsSpaceUsed}
                    titleSize="s"
                  />
                </EuiFlexItem>
                <EuiFlexItem grow={1}>
                  <EuiStat
                    title={Object.values(data.countByStatus).reduce((acc, value) => acc + value, 0)}
                    description={i18nTexts.diagnosticsTotalCount}
                    titleSize="s"
                  />
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiPanel>
            <EuiSpacer />
            <EuiPanel hasBorder hasShadow={false}>
              <EuiTitle size="xs">
                <h3>{i18nTexts.diagnosticsBreakdownsStatus}</h3>
              </EuiTitle>
              <Chart size={{ height: 200, width: '100%' }}>
                <Axis id="y" position={Position.Left} showOverlappingTicks />
                <Axis id="x" position={Position.Bottom} showOverlappingTicks />
                <HistogramBarSeries
                  data={Object.entries(data.countByStatus).map(([key, count]) => ({
                    key,
                    count,
                  }))}
                  id="Status"
                  xAccessor={'key'}
                  yAccessors={['count']}
                  xScaleType={ScaleType.Time}
                  yScaleType={ScaleType.Linear}
                  timeZone="local"
                />
              </Chart>
            </EuiPanel>
            <EuiSpacer />
            <EuiPanel hasBorder hasShadow={false}>
              <EuiTitle size="xs">
                <h3>{i18nTexts.diagnosticsBreakdownsExtension}</h3>
              </EuiTitle>
              <Chart size={{ height: 200, width: '100%' }}>
                <Axis id="y" position={Position.Left} showOverlappingTicks />
                <Axis id="x" position={Position.Bottom} showOverlappingTicks />
                <HistogramBarSeries
                  data={Object.entries(data.countByExtension).map(([key, count]) => ({
                    key,
                    count,
                  }))}
                  id="Extension"
                  xAccessor={'key'}
                  yAccessors={['count']}
                  xScaleType={ScaleType.Time}
                  yScaleType={ScaleType.Linear}
                  timeZone="local"
                />
              </Chart>
            </EuiPanel>
          </>
        )}
      </EuiFlyoutBody>
    </EuiFlyout>
  );
};
