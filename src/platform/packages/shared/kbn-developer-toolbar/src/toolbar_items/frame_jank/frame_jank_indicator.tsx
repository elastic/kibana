/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useEffect, useState } from 'react';
import type { EuiThemeComputed } from '@elastic/eui';
import { EuiBadge, EuiToolTip, EuiTextColor, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { type PerformanceInfo, PerformanceMonitor } from './performance_monitor';
import { LongTaskMonitor } from './long_task_monitor';
import { INPMonitor } from './inp_monitor';

const WIDTH = 78;
const HEIGHT = 20;
const WARNING_THRESHOLD = 15; // Percentage of jank that triggers a warning

// Performance severity thresholds
const THRESHOLDS = {
  jankPercentage: { warning: 15, danger: 30 },
  fps: { warning: 45, danger: 30 },
  longTasks: { warning: 3, danger: 10 },
  blockingTime: { warning: 200, danger: 500 },
  inp: { warning: 100, danger: 300 },
};

type SeverityLevel = 'normal' | 'warning' | 'danger';

const getSeverityColor = (metricType: keyof typeof THRESHOLDS, value: number): SeverityLevel => {
  const threshold = THRESHOLDS[metricType];
  if (metricType === 'fps') {
    // For FPS, lower values are worse
    if (value < threshold.danger) return 'danger';
    if (value < threshold.warning) return 'warning';
  } else {
    // For other metrics, higher values are worse
    if (value >= threshold.danger) return 'danger';
    if (value >= threshold.warning) return 'warning';
  }
  return 'normal';
};

const SeverityValue: React.FC<{
  metricType: keyof typeof THRESHOLDS;
  value: number;
  children: React.ReactNode;
}> = ({ metricType, value, children }) => {
  const severity = getSeverityColor(metricType, value);
  if (severity === 'normal') {
    return <>{children}</>;
  }
  return <EuiTextColor color={severity}>{children}</EuiTextColor>;
};

const getContainerStyles = (euiTheme: EuiThemeComputed) => css`
  position: relative;
  width: ${WIDTH}px;
  height: ${HEIGHT}px;

  background-color: ${euiTheme.colors.emptyShade};
  border-radius: 2px; // badge border radius is 2px, TODO: not available in euiTheme.border
  overflow: hidden;
`;

const getGraphContainerStyles = (euiTheme: EuiThemeComputed) => css`
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  top: 0;
  z-index: 0;

  display: flex;
  align-items: flex-end;

  overflow: hidden;
`;

const getBadgeStyles = (euiTheme: EuiThemeComputed) => css`
  background-color: transparent;
  z-index: 1;
  position: absolute;
  cursor: default;
`;

const getBarStyles = (
  euiTheme: EuiThemeComputed,
  height: number,
  warning: boolean,
  position: number
) => css`
  position: absolute;
  bottom: 0;
  left: ${position}px;
  width: 3px;
  height: ${height}px;
  background-color: ${warning ? euiTheme.colors.severity.danger : euiTheme.colors.severity.neutral};
`;

export const FrameJankIndicator: React.FC = () => {
  const { euiTheme } = useEuiTheme();
  const [perfInfo, setPerfInfo] = useState<PerformanceInfo | null>(null);
  const [longTaskStats, setLongTaskStats] = useState<{
    tasksInLast30Seconds: number;
    totalBlockingTime: number;
    lastTaskDuration?: number;
  }>({ tasksInLast30Seconds: 0, totalBlockingTime: 0 });
  const [inpStats, setInpStats] = useState<{
    currentINP: number;
    slowInteractionsCount: number;
    worstInteractionDelay: number;
    lastInteractionDelay: number;
  }>({
    currentINP: 0,
    slowInteractionsCount: 0,
    worstInteractionDelay: 0,
    lastInteractionDelay: 0,
  });

  useEffect(() => {
    const performanceMonitor = new PerformanceMonitor(Math.ceil(WIDTH / 4));
    const longTaskMonitor = new LongTaskMonitor();
    const inpMonitor = new INPMonitor();

    performanceMonitor.startMonitoring();
    const perfUnsubscribe = performanceMonitor.subscribe(setPerfInfo);

    let longTaskUnsubscribe = () => {};
    let inpUnsubscribe = () => {};

    if (longTaskMonitor.isSupported()) {
      longTaskMonitor.startMonitoring();

      longTaskUnsubscribe = longTaskMonitor.subscribe((taskInfo) => {
        setLongTaskStats({
          tasksInLast30Seconds: taskInfo.tasksInLast30Seconds,
          totalBlockingTime: taskInfo.totalBlockingTime,
          lastTaskDuration: taskInfo.duration,
        });
      });
    }

    if (inpMonitor.isSupported()) {
      inpMonitor.startMonitoring();

      inpUnsubscribe = inpMonitor.subscribe((inpInfo) => {
        setInpStats({
          currentINP: inpInfo.currentINP,
          slowInteractionsCount: inpInfo.slowInteractionsCount,
          worstInteractionDelay: inpInfo.worstInteractionDelay,
          lastInteractionDelay: inpInfo.lastInteractionDelay,
        });
      });
    }

    return () => {
      performanceMonitor.stopMonitoring();
      longTaskMonitor.destroy();
      inpMonitor.destroy();
      perfUnsubscribe();
      longTaskUnsubscribe();
      inpUnsubscribe();
    };
  }, []);

  const tooltipContent = (
    <div>
      <div>
        <strong>Performance Monitor</strong>
      </div>
      {perfInfo && (
        <>
          <br />
          <div>
            <strong>Frame Performance:</strong>
          </div>
          <div>
            Current FPS:{' '}
            <SeverityValue metricType="fps" value={perfInfo.fps}>
              {perfInfo.fps}
            </SeverityValue>
          </div>
          <div>Max FPS: {perfInfo.maxFps}</div>
          <div>
            Min FPS:{' '}
            <SeverityValue metricType="fps" value={perfInfo.minFps}>
              {perfInfo.minFps}
            </SeverityValue>
          </div>
          <div>
            Jank:{' '}
            <SeverityValue metricType="jankPercentage" value={perfInfo.jankPercentage}>
              {perfInfo.jankPercentage}%
            </SeverityValue>
          </div>
          <div>Samples: {perfInfo.history.length}</div>
        </>
      )}
      <br />
      <div>
        <strong>Main thread blocks ≥100ms:</strong>
      </div>
      <div>
        Long Task:{' '}
        <SeverityValue metricType="longTasks" value={longTaskStats.tasksInLast30Seconds}>
          {longTaskStats.tasksInLast30Seconds}
        </SeverityValue>
      </div>
      <div>
        Blocking time:{' '}
        <SeverityValue metricType="blockingTime" value={longTaskStats.totalBlockingTime}>
          {Math.round(longTaskStats.totalBlockingTime)}ms
        </SeverityValue>
      </div>
      {longTaskStats.lastTaskDuration && (
        <div>Last task: {Math.round(longTaskStats.lastTaskDuration)}ms</div>
      )}
      <br />
      <div>
        <strong>Slow Interactions ≥100ms:</strong>
      </div>
      <div>
        Current INP:{' '}
        <SeverityValue metricType="inp" value={inpStats.currentINP}>
          {Math.round(inpStats.currentINP)}ms
        </SeverityValue>
      </div>
      <div>Slow interactions: {inpStats.slowInteractionsCount}</div>
      {inpStats.lastInteractionDelay > 0 && (
        <div>Last slow: {Math.round(inpStats.lastInteractionDelay)}ms</div>
      )}
      {inpStats.worstInteractionDelay > 0 && (
        <div>Worst: {Math.round(inpStats.worstInteractionDelay)}ms</div>
      )}
    </div>
  );

  return (
    <EuiToolTip content={tooltipContent}>
      <div css={getContainerStyles(euiTheme)}>
        <EuiBadge color={'default'} css={getBadgeStyles(euiTheme)}>
          Jank {perfInfo ? `${perfInfo.jankPercentage}%` : '-%'}
        </EuiBadge>
        <div css={getGraphContainerStyles(euiTheme)}>
          {perfInfo?.history.map((sample, i) => {
            const framesDropped = perfInfo.maxFps - sample;
            const isWarning = framesDropped > WARNING_THRESHOLD;
            const barHeight = Math.min(
              Math.max(Math.ceil((HEIGHT * framesDropped) / perfInfo.maxFps), 3),
              HEIGHT
            );

            const position = i * 4;

            return <div key={i} css={getBarStyles(euiTheme, barHeight, isWarning, position)} />;
          })}
        </div>
      </div>
    </EuiToolTip>
  );
};
