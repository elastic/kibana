/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useEffect, useState } from 'react';
import { EuiBadge, EuiTextColor, EuiToolTip } from '@elastic/eui';
import { css } from '@emotion/react';
import { MemoryMonitor, type MemoryInfo } from './memory_monitor';

const TREND_MIN_SAMPLES = 10;

const badgeStyles = css`
  cursor: default;
`;

const tooltipContentStyles = css`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const emphasisStyles = css`
  font-weight: bold;
`;

const formatTrend = (trend: number): string => {
  const roundedTrend = Math.round(trend * 10) / 10;
  const normalizedTrend = Object.is(roundedTrend, -0) ? 0 : roundedTrend;
  return `${normalizedTrend > 0 ? '+' : ''}${normalizedTrend.toFixed(1)}`;
};

export const MemoryUsageIndicator: React.FC = () => {
  const [memoryInfo, setMemoryInfo] = useState<MemoryInfo | null | undefined>(undefined);

  useEffect(() => {
    const monitor = new MemoryMonitor();
    const unsubscribe = monitor.subscribe(setMemoryInfo);
    monitor.startMonitoring();

    return () => {
      unsubscribe();
      monitor.destroy();
    };
  }, []);

  if (memoryInfo === undefined || memoryInfo === null) {
    const tooltipContent =
      memoryInfo === undefined ? 'Measuring heap…' : 'Heap size unavailable.';

    return (
      <EuiToolTip content={<div>{tooltipContent}</div>}>
        <EuiBadge color="#0B1628" css={badgeStyles} tabIndex={0} title={undefined}>
          Mem -GiB
        </EuiBadge>
      </EuiToolTip>
    );
  }

  const { heapUsageRatio, growthDetected, sampleCount, shortTrendPerMin } = memoryInfo;
  const isUnderHeapPressure = heapUsageRatio > 0.85;
  const warningSeverity =
    growthDetected && isUnderHeapPressure
      ? 'danger'
      : growthDetected || isUnderHeapPressure
      ? 'warning'
      : null;
  const memoryGiB = (memoryInfo.memoryUsage / 1024).toFixed(2);
  const trendText =
    sampleCount >= TREND_MIN_SAMPLES && Number.isFinite(shortTrendPerMin)
      ? `Trend: ${formatTrend(shortTrendPerMin)} MB/min`
      : null;
  const heapUtilizationPercentage = Math.round(heapUsageRatio * 100);

  const tooltipContent = (
    <div css={tooltipContentStyles}>
      <div>
        <div>JS heap: {memoryGiB} GiB</div>
        {isUnderHeapPressure ? (
          <div css={emphasisStyles}>
            <EuiTextColor color={warningSeverity ?? 'warning'}>
              Heap limit used: {heapUtilizationPercentage}%
            </EuiTextColor>
          </div>
        ) : (
          <div>Heap limit used: {heapUtilizationPercentage}%</div>
        )}
      </div>
      {(trendText || growthDetected) && (
        <div>
          {trendText && <div>{trendText}</div>}
          {growthDetected && (
            <div css={emphasisStyles}>
              <EuiTextColor color={warningSeverity ?? 'warning'}>
                Heap growing steadily.
              </EuiTextColor>
            </div>
          )}
        </div>
      )}
      <div>
        Chrome’s JS heap estimate, sampled every 20s while visible. Steady growth vs baseline, not
        a confirmed leak.
      </div>
    </div>
  );

  return (
    <EuiToolTip content={tooltipContent}>
      <EuiBadge
        color={warningSeverity ?? '#0B1628'}
        css={badgeStyles}
        iconType={warningSeverity ? 'warningFill' : undefined}
        iconSide={'right'}
        title={undefined}
        tabIndex={0}
      >
        {`Mem ${memoryGiB}GiB`}
      </EuiBadge>
    </EuiToolTip>
  );
};
