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
      monitor.stopMonitoring();
      unsubscribe();
    };
  }, []);

  if (!memoryInfo) {
    const displayText = 'Mem -GB';
    const tooltipContent = MemoryMonitor.isSupported() ? (
      <div>Memory monitoring is initializing...</div>
    ) : (
      <div>Memory monitoring is not supported in this environment.</div>
    );

    return (
      <EuiToolTip content={tooltipContent}>
        <EuiBadge color="#0B1628" css={badgeStyles}>
          {displayText}
        </EuiBadge>
      </EuiToolTip>
    );
  }

  const warningThreshold = 1000; // 1GB in MB
  const isWarning = memoryInfo.memoryUsage > warningThreshold || memoryInfo.leak;
  const memoryGB = (memoryInfo.memoryUsage / 1000).toFixed(2);

  const tooltipContent = (
    <div>
      <div>Memory usage: {memoryGB}GB</div>
      <div>Threshold: {(warningThreshold / 1000).toFixed(1)}GB</div>
      {memoryInfo.leak && (
        <div>
          <EuiIcon type="warningFilled" color={'danger'} size="s" /> Potential memory leak detected
        </div>
      )}
      <div>Samples: {memoryInfo.history.length}</div>
    </div>
  );

  const displayText = `Mem ${memoryGB}GB`;

  return (
    <EuiToolTip content={tooltipContent}>
      <EuiBadge
        color={isWarning ? 'danger' : '#0B1628'}
        css={badgeStyles}
        iconType={memoryInfo.leak ? 'warningFilled' : undefined}
        iconSide={'right'}
      >
        {displayText}
      </EuiBadge>
    </EuiToolTip>
  );
};
