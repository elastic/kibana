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
import { LongTaskMonitor, type LongTaskInfo } from './long_task_monitor';
import { INPMonitor, type INPInfo } from './inp_monitor';

const WIDTH = 78;
const HEIGHT = 20;
const GRAPH_SAMPLE_COUNT = Math.ceil(WIDTH / 4);
const GRAPH_POSITIONS = Array.from({ length: GRAPH_SAMPLE_COUNT }, (_, index) => index);

// Performance severity thresholds
const THRESHOLDS = {
  jankPercentage: { warning: 15, danger: 30 },
  fps: { warning: 45, danger: 30 },
  longTasks: { warning: 3, danger: 10 },
  stall: { warning: 100, danger: 300 },
  blockingTime: { warning: 200, danger: 500 },
  inp: { warning: 100, danger: 300 },
};

type SeverityLevel = 'normal' | 'warning' | 'danger';
interface PerformanceWarning {
  kind: 'input' | 'stall' | 'blocking' | 'frames';
  severity: 'warning' | 'danger';
}

const getPerformanceWarning = (
  perfInfo: PerformanceInfo | null,
  longTaskStats: LongTaskInfo,
  inpStats: INPInfo
): PerformanceWarning | null => {
  const candidates: PerformanceWarning[] = [];

  if (inpStats.worstInteractionDelay >= THRESHOLDS.inp.warning) {
    candidates.push({
      kind: 'input',
      severity: inpStats.worstInteractionDelay >= THRESHOLDS.inp.danger ? 'danger' : 'warning',
    });
  }
  if (longTaskStats.worstTaskDuration >= THRESHOLDS.stall.warning) {
    candidates.push({
      kind: 'stall',
      severity: longTaskStats.worstTaskDuration >= THRESHOLDS.stall.danger ? 'danger' : 'warning',
    });
  }
  if (longTaskStats.totalBlockingTime >= THRESHOLDS.blockingTime.warning) {
    candidates.push({
      kind: 'blocking',
      severity:
        longTaskStats.totalBlockingTime >= THRESHOLDS.blockingTime.danger ? 'danger' : 'warning',
    });
  }
  if (
    perfInfo &&
    perfInfo.history.length >= 3 &&
    perfInfo.jankPercentage >= THRESHOLDS.jankPercentage.warning
  ) {
    candidates.push({
      kind: 'frames',
      severity: perfInfo.jankPercentage >= THRESHOLDS.jankPercentage.danger ? 'danger' : 'warning',
    });
  }

  return (
    candidates.find(({ severity }) => severity === 'danger') ??
    candidates.find(({ severity }) => severity === 'warning') ??
    null
  );
};

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
  border-radius: 24px;
  overflow: hidden;
`;

const graphContainerStyles = css`
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

const getBadgeStyles = () => css`
  background-color: transparent;
  z-index: 1;
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
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
const triggerStyles = css`
  width: ${WIDTH}px;
  height: ${HEIGHT}px;
`;

const tooltipContentStyles = css`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const selectedMetricStyles = css`
  font-weight: bold;
`;

export const FrameJankIndicator: React.FC = () => {
  const { euiTheme } = useEuiTheme();
  const [perfInfo, setPerfInfo] = useState<PerformanceInfo | null>(null);
  const [frameSupported, setFrameSupported] = useState<boolean | null>(null);
  const [longTaskStats, setLongTaskStats] = useState<LongTaskInfo>({
    worstTaskDuration: 0,
    totalBlockingTime: 0,
    tasksInLast30Seconds: 0,
  });
  const [inpStats, setInpStats] = useState<INPInfo>({
    slowInteractionsCount: 0,
    worstInteractionDelay: 0,
  });
  const [longTaskSupported, setLongTaskSupported] = useState<boolean | null>(null);
  const [inpSupported, setInpSupported] = useState<boolean | null>(null);

  useEffect(() => {
    const performanceMonitor = new PerformanceMonitor(GRAPH_SAMPLE_COUNT);
    const longTaskMonitor = new LongTaskMonitor();
    const inpMonitor = new INPMonitor();

    const perfUnsubscribe = performanceMonitor.subscribe(setPerfInfo);
    const longTaskUnsubscribe = longTaskMonitor.subscribe(setLongTaskStats);
    const inpUnsubscribe = inpMonitor.subscribe(setInpStats);

    const supportsFrames = performanceMonitor.isSupported();
    const supportsLongTasks = longTaskMonitor.isSupported();
    const supportsInp = inpMonitor.isSupported();
    setFrameSupported(supportsFrames);
    setLongTaskSupported(supportsLongTasks);
    setInpSupported(supportsInp);
    if (supportsFrames) {
      performanceMonitor.startMonitoring();
    }
    if (supportsLongTasks) {
      longTaskMonitor.startMonitoring();
    }
    if (supportsInp) {
      inpMonitor.startMonitoring();
    }

    return () => {
      performanceMonitor.destroy();
      longTaskMonitor.destroy();
      inpMonitor.destroy();
      perfUnsubscribe();
      longTaskUnsubscribe();
      inpUnsubscribe();
    };
  }, []);
  const frameInfo = perfInfo?.history.length ? perfInfo : null;
  const warning = getPerformanceWarning(frameInfo, longTaskStats, inpStats);

  const warningReason =
    warning?.kind === 'input'
      ? 'Slow interaction'
      : warning?.kind === 'stall'
      ? 'Long task'
      : warning?.kind === 'blocking'
      ? 'Blocking time'
      : warning?.kind === 'frames'
      ? 'Frame jank'
      : null;

  const tooltipContent = (
    <div css={tooltipContentStyles}>
      <div>
        <div>
          <strong>Frames · {GRAPH_SAMPLE_COUNT}s</strong>
        </div>
        {frameSupported === false ? (
          <div>Not supported in this browser.</div>
        ) : !frameInfo ? (
          <div>Measuring…</div>
        ) : (
          <>
            <div>
              FPS:{' '}
              <SeverityValue metricType="fps" value={frameInfo.fps}>
                {frameInfo.fps}
              </SeverityValue>{' '}
              (min {frameInfo.minFps})
            </div>
            <div css={warning?.kind === 'frames' ? selectedMetricStyles : undefined}>
              Jank:{' '}
              <SeverityValue metricType="jankPercentage" value={frameInfo.jankPercentage}>
                {frameInfo.jankPercentage}%
              </SeverityValue>{' '}
              of seconds below {Math.round(frameInfo.baselineFps * 0.85)} FPS
            </div>
          </>
        )}
      </div>
      <div>
        <div>
          <strong>Main thread · 30s</strong>
        </div>
        {longTaskSupported === false ? (
          <div>Not supported in this browser.</div>
        ) : longTaskSupported ? (
          <>
            <div>
              Long tasks (≥100ms):{' '}
              <SeverityValue metricType="longTasks" value={longTaskStats.tasksInLast30Seconds}>
                {longTaskStats.tasksInLast30Seconds}
              </SeverityValue>
            </div>
            <div css={warning?.kind === 'blocking' ? selectedMetricStyles : undefined}>
              Blocking time:{' '}
              <SeverityValue metricType="blockingTime" value={longTaskStats.totalBlockingTime}>
                {Math.round(longTaskStats.totalBlockingTime)}ms
              </SeverityValue>
            </div>
            {longTaskStats.worstTaskDuration > 0 && (
              <div css={warning?.kind === 'stall' ? selectedMetricStyles : undefined}>
                <SeverityValue metricType="stall" value={longTaskStats.worstTaskDuration}>
                  Longest: {Math.round(longTaskStats.worstTaskDuration)}ms
                </SeverityValue>
              </div>
            )}
          </>
        ) : null}
      </div>
      <div>
        <div>
          <strong>Interactions · 30s</strong>
        </div>
        {inpSupported === false ? (
          <div>Not supported in this browser.</div>
        ) : inpSupported ? (
          <>
            <div>Slow interactions (≥100ms): {inpStats.slowInteractionsCount}</div>
            {inpStats.worstInteractionDelay > 0 && (
              <div css={warning?.kind === 'input' ? selectedMetricStyles : undefined}>
                <SeverityValue metricType="inp" value={inpStats.worstInteractionDelay}>
                  Slowest: {Math.round(inpStats.worstInteractionDelay)}ms
                </SeverityValue>
              </div>
            )}
          </>
        ) : null}
      </div>
    </div>
  );

  const triggerAriaLabel = warningReason
    ? `Performance warning: ${warningReason}`
    : 'Performance monitor';
  const measuredHistory = frameInfo?.history ?? [];
  const placeholderCount = Math.max(0, GRAPH_SAMPLE_COUNT - measuredHistory.length);
  const graphBaseline = frameInfo?.baselineFps ?? 60;
  const badgeValue = frameSupported === false || !frameInfo ? '—' : `${frameInfo.jankPercentage}%`;

  return (
    <EuiToolTip content={tooltipContent}>
      <div css={triggerStyles} tabIndex={0} aria-label={triggerAriaLabel}>
        <div css={getContainerStyles(euiTheme)} data-test-subj="performanceIndicator">
          {/* EuiBadge derives a native title from its text; undefined suppresses the duplicate. */}
          <EuiBadge color="default" css={getBadgeStyles()} title={undefined}>
            {warning ? (
              <EuiTextColor color={warning.severity}>Jank {badgeValue}</EuiTextColor>
            ) : (
              <>Jank {badgeValue}</>
            )}
          </EuiBadge>
          <div css={graphContainerStyles}>
            {GRAPH_POSITIONS.map((position) => {
              const measuredIndex = position - placeholderCount;
              const sample = measuredIndex >= 0 ? measuredHistory[measuredIndex] : graphBaseline;
              const hasValidBaseline = Number.isFinite(graphBaseline) && graphBaseline > 0;
              const isMeasured = measuredIndex >= 0;
              const isWarning = isMeasured && hasValidBaseline && sample < graphBaseline * 0.85;
              const barHeight =
                isMeasured && hasValidBaseline
                  ? Math.min(
                      HEIGHT,
                      Math.max(
                        3,
                        Math.ceil((HEIGHT * Math.max(0, graphBaseline - sample)) / graphBaseline)
                      )
                    )
                  : 3;

              return (
                <div
                  key={position}
                  data-test-subj="performanceGraphBar"
                  css={getBarStyles(euiTheme, barHeight, isWarning, position * 4)}
                />
              );
            })}
          </div>
        </div>
      </div>
    </EuiToolTip>
  );
};
