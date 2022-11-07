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
  EuiCallOut,
  EuiButton,
  EuiLoadingSpinner,
  EuiDescriptionList,
  EuiTitle,
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
  const { status, refetch, data } = useQuery(['filesDiagnostics'], async () => {
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
          <EuiCallOut color="danger">
            <p>{i18nTexts.failedToFetchDiagnostics}</p>
            <EuiButton onClick={() => refetch()}>{i18nTexts.retry}</EuiButton>
          </EuiCallOut>
        ) : status === 'loading' ? (
          <EuiLoadingSpinner size="xl" />
        ) : (
          <EuiDescriptionList
            type="row"
            textStyle="reverse"
            listItems={[
              {
                title: i18nTexts.diagnosticsTotalCount,
                description: Object.values(data.countByStatus).reduce(
                  (acc, value) => acc + value,
                  0
                ),
              },
              {
                title: i18nTexts.diagnosticsSpaceUsed,
                description: numeral(data.storage.esFixedSizeIndex.used).format('0[.]0 b'),
              },
              {
                title: i18nTexts.diagnosticsBreakdownsStatus,
                description: (
                  <Chart size={{ height: 200, width: 300 - 32 }}>
                    <Axis id="key" position={Position.Bottom} showOverlappingTicks />
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
                ),
              },
              {
                title: i18nTexts.diagnosticsBreakdownsExtension,
                description: (
                  <Chart size={{ height: 200, width: 300 - 32 }}>
                    <Axis id="key" position={Position.Bottom} showOverlappingTicks />
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
                ),
              },
            ]}
          />
        )}
      </EuiFlyoutBody>
    </EuiFlyout>
  );
};
