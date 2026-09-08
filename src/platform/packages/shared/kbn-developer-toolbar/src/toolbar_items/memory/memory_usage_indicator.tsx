/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useEffect, useState } from 'react';
import { EuiToolTip, EuiBadge, EuiIcon } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { MemoryMonitor, type MemoryInfo } from './memory_monitor';

const badgeStyles = css`
  cursor: default;
`;

export const MemoryUsageIndicator: React.FC = () => {
  const [memoryInfo, setMemoryInfo] = useState<MemoryInfo | null>(null);

  useEffect(() => {
    if (!MemoryMonitor.isSupported()) return;

    const monitor = new MemoryMonitor();
    monitor.startMonitoring();

    const unsubscribe = monitor.subscribe(setMemoryInfo);

    return () => {
      unsubscribe();
      monitor.destroy();
    };
  }, []);

  if (!memoryInfo) {
    const displayText = i18n.translate('developerToolbar.memory.placeholderBadgeLabel', {
      defaultMessage: 'Mem -GiB',
    });
    const tooltipContent = MemoryMonitor.isSupported() ? (
      <div>Memory monitoring is initializing...</div>
    ) : (
      <div>Memory monitoring is not supported in this environment.</div>
    );

    return (
      <EuiToolTip content={tooltipContent}>
        <EuiBadge color="#0B1628" css={badgeStyles} tabIndex={0}>
          {displayText}
        </EuiBadge>
      </EuiToolTip>
    );
  }

  const warningThresholdMiB = 1000;
  const isOverSizeThreshold = memoryInfo.memoryUsage > warningThresholdMiB;
  const isWarning = isOverSizeThreshold || memoryInfo.leak;
  const memoryGiB = (memoryInfo.memoryUsage / 1024).toFixed(2);

  const tooltipContent = (
    <div>
      <div>
        {i18n.translate('developerToolbar.memory.heapUsageLabel', {
          defaultMessage: 'JavaScript heap: {value} GiB',
          values: { value: memoryGiB },
        })}
      </div>
      <div>
        {i18n.translate('developerToolbar.memory.sizeThresholdLabel', {
          defaultMessage: 'Size warning threshold: {threshold} MiB',
          values: { threshold: warningThresholdMiB },
        })}
      </div>
      {isOverSizeThreshold && (
        <div>
          {i18n.translate('developerToolbar.memory.sizeWarningDescription', {
            defaultMessage: 'Heap exceeds the size threshold; this alone does not indicate a leak.',
          })}
        </div>
      )}
      {memoryInfo.leak && (
        <div>
          <EuiIcon type="warningFill" color={'danger'} size="s" aria-hidden={true} />{' '}
          {i18n.translate('developerToolbar.memory.growthWarningDescription', {
            defaultMessage:
              'Sustained heap growth under high pressure; possible leak, not a diagnosis.',
          })}
        </div>
      )}
      <div>
        {i18n.translate('developerToolbar.memory.measurementDescription', {
          defaultMessage: 'Approximate JavaScript heap usage, not total browser memory.',
        })}
      </div>
      <div>Samples: {memoryInfo.history.length}</div>
    </div>
  );

  const displayText = i18n.translate('developerToolbar.memory.usageBadgeLabel', {
    defaultMessage: 'Mem {value}GiB',
    values: { value: memoryGiB },
  });

  return (
    <EuiToolTip content={tooltipContent}>
      <EuiBadge
        color={isWarning ? 'danger' : '#0B1628'}
        css={badgeStyles}
        iconType={memoryInfo.leak ? 'warningFill' : undefined}
        iconSide={'right'}
        tabIndex={0}
      >
        {displayText}
      </EuiBadge>
    </EuiToolTip>
  );
};
