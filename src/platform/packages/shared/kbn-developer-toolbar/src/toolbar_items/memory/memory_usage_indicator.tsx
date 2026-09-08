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
      memoryInfo === undefined ? 'Measuring JavaScript heap…' : 'JavaScript heap unavailable.';

    return (
      <EuiToolTip content={<div>{tooltipContent}</div>}>
        <EuiBadge color="#0B1628" css={badgeStyles} tabIndex={0} title={undefined}>
          Mem -GiB
        </EuiBadge>
      </EuiToolTip>
    );
  }

  const { heapUsageRatio } = memoryInfo;
  const isUnderHeapPressure = (heapUsageRatio ?? 0) > 0.85;
  const isWarning = memoryInfo.leak || isUnderHeapPressure;
  const badgeColor = memoryInfo.leak ? 'danger' : isUnderHeapPressure ? 'warning' : '#0B1628';
  const memoryGiB = (memoryInfo.memoryUsage / 1024).toFixed(2);
  const trend = memoryInfo.details?.shortTrendPerMin;
  const trendText =
    memoryInfo.history.length < 10
      ? 'Recent trend: collecting samples…'
      : trend === undefined || !Number.isFinite(trend)
      ? 'Recent trend unavailable.'
      : `Recent trend: ${formatTrend(trend)} MiB/min`;
  const heapUtilizationPercentage =
    heapUsageRatio !== undefined && Number.isFinite(heapUsageRatio)
      ? Math.round(heapUsageRatio * 100)
      : null;

  const tooltipContent = (
    <div css={tooltipContentStyles}>
      <div>
        <div>Heap: {memoryGiB} GiB</div>
        {heapUtilizationPercentage !== null &&
          (isUnderHeapPressure ? (
            <div css={emphasisStyles}>
              <EuiTextColor color={memoryInfo.leak ? 'danger' : 'warning'}>
                Heap limit used: {heapUtilizationPercentage}%
              </EuiTextColor>
            </div>
          ) : (
            <div>Heap limit used: {heapUtilizationPercentage}%</div>
          ))}
      </div>
      <div>
        <div>{trendText}</div>
        {memoryInfo.leak ? (
          <div css={emphasisStyles}>
            <EuiTextColor color="danger">
              Sustained growth near the heap limit; possible leak.
            </EuiTextColor>
          </div>
        ) : isUnderHeapPressure ? (
          <div>More than 85% of the browser-reported heap limit is in use.</div>
        ) : null}
      </div>
      <div>
        <div>
          Approximate JavaScript heap; sampled every 20 s while visible. Growth can include
          allocations awaiting garbage collection.
        </div>
        {isWarning && (
          <div>
            Compare heap snapshots in browser DevTools → Memory after repeating the same action.
          </div>
        )}
      </div>
    </div>
  );

  const displayText = `Mem ${memoryGiB}GiB`;

  return (
    <EuiToolTip content={tooltipContent}>
      <EuiBadge
        color={badgeColor}
        css={badgeStyles}
        iconType={isWarning ? 'warningFill' : undefined}
        iconSide={'right'}
        title={undefined}
        tabIndex={0}
      >
        {displayText}
      </EuiBadge>
    </EuiToolTip>
  );
};
