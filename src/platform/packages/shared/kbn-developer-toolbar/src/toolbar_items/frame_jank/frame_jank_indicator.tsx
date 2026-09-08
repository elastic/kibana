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
type PerformanceWarning =
  | { kind: 'input'; severity: 'warning' | 'danger'; duration: number; startTime: number }
  | { kind: 'stall'; severity: 'warning' | 'danger'; duration: number; startTime: number }
  | { kind: 'blocking'; severity: 'warning' | 'danger'; duration: number }
  | { kind: 'frames'; severity: 'warning' | 'danger'; percentage: number };

const getPerformanceWarning = (
  perfInfo: PerformanceInfo | null,
  longTaskStats: LongTaskInfo,
  inpStats: INPInfo
): PerformanceWarning | null => {
  const candidates: PerformanceWarning[] = [];

  if (inpStats.worstInteractionStartTime !== null && inpStats.worstInteractionDelay >= 100) {
    candidates.push({
      kind: 'input',
      severity: inpStats.worstInteractionDelay >= 300 ? 'danger' : 'warning',
      duration: inpStats.worstInteractionDelay,
      startTime: inpStats.worstInteractionStartTime,
    });
  }
  if (longTaskStats.worstTaskStartTime !== null && longTaskStats.worstTaskDuration >= 100) {
    candidates.push({
      kind: 'stall',
      severity: longTaskStats.worstTaskDuration >= 300 ? 'danger' : 'warning',
      duration: longTaskStats.worstTaskDuration,
      startTime: longTaskStats.worstTaskStartTime,
    });
  }
  if (longTaskStats.totalBlockingTime >= THRESHOLDS.blockingTime.warning) {
    candidates.push({
      kind: 'blocking',
      severity:
        longTaskStats.totalBlockingTime >= THRESHOLDS.blockingTime.danger ? 'danger' : 'warning',
      duration: longTaskStats.totalBlockingTime,
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
      percentage: perfInfo.jankPercentage,
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
const getTriggerStyles = () => css`
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
    duration: 0,
    worstTaskDuration: 0,
    worstTaskStartTime: null,
    totalBlockingTime: 0,
    tasksInLast30Seconds: 0,
  });
  const [inpStats, setInpStats] = useState<INPInfo>({
    currentINP: 0,
    slowInteractionsCount: 0,
    worstInteractionDelay: 0,
    worstInteractionStartTime: null,
    lastInteractionDelay: 0,
  });
  const [longTaskSupported, setLongTaskSupported] = useState<boolean | null>(null);
  const [inpSupported, setInpSupported] = useState<boolean | null>(null);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [ageClock, setAgeClock] = useState(() => performance.now());

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
      performanceMonitor.stopMonitoring();
      longTaskMonitor.destroy();
      inpMonitor.destroy();
      perfUnsubscribe();
      longTaskUnsubscribe();
      inpUnsubscribe();
    };
  }, []);
  const warning = getPerformanceWarning(
    perfInfo,
    longTaskSupported === false
      ? {
          duration: 0,
          worstTaskDuration: 0,
          worstTaskStartTime: null,
          totalBlockingTime: 0,
          tasksInLast30Seconds: 0,
        }
      : longTaskStats,
    inpSupported === false
      ? {
          currentINP: 0,
          slowInteractionsCount: 0,
          worstInteractionDelay: 0,
          worstInteractionStartTime: null,
          lastInteractionDelay: 0,
        }
      : inpStats
  );
  const active = hovered || focused;
  const timingStartTime =
    warning?.kind === 'input' || warning?.kind === 'stall' ? warning.startTime : null;

  useEffect(() => {
    if (!active || timingStartTime === null) return;

    let interval: number | undefined;
    const refresh = () => setAgeClock(performance.now());
    const syncInterval = () => {
      if (interval !== undefined) {
        window.clearInterval(interval);
        interval = undefined;
      }
      if (!document.hidden) {
        refresh();
        interval = window.setInterval(refresh, 1000);
      }
    };
    const handleVisibilityChange = () => syncInterval();

    syncInterval();
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      if (interval !== undefined) window.clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [active, timingStartTime]);

  const warningReason =
    warning?.kind === 'input'
      ? 'Slow interaction'
      : warning?.kind === 'stall'
      ? 'Main-thread stall'
      : warning?.kind === 'blocking'
      ? 'Elevated blocking time'
      : warning?.kind === 'frames'
      ? 'Frame slowdown'
      : null;
  const selectedIncidentAge =
    timingStartTime === null ? null : Math.max(0, Math.floor((ageClock - timingStartTime) / 1000));

  const tooltipContent = (
    <div css={tooltipContentStyles}>
      <div>
        <div>
          <strong>Frames</strong>
        </div>
        {frameSupported === false ? (
          <div>Frame timing unavailable in this browser.</div>
        ) : (
          <>
            <div>
              FPS:{' '}
              {perfInfo ? (
                <SeverityValue metricType="fps" value={perfInfo.fps}>
                  {perfInfo.fps}
                </SeverityValue>
              ) : (
                '—'
              )}
            </div>
            <div>Range: {perfInfo ? `${perfInfo.minFps}–${perfInfo.maxFps}` : '—'}</div>
            <div css={warning?.kind === 'frames' ? selectedMetricStyles : undefined}>
              Slow samples:{' '}
              {perfInfo ? (
                <>
                  <SeverityValue metricType="jankPercentage" value={perfInfo.jankPercentage}>
                    {perfInfo.jankPercentage}%
                  </SeverityValue>{' '}
                  (below {Number((perfInfo.baselineFps * 0.85).toFixed(1))} FPS)
                </>
              ) : (
                '—'
              )}
            </div>
            <div>Samples: {perfInfo?.history.length ?? 0}</div>
            <div>Jank counts slow one-second samples, not dropped frames.</div>
            <div>
              {perfInfo
                ? 'Frame warnings use at least 3 measured samples.'
                : 'Measuring frames… Initial 0% is a placeholder.'}
            </div>
          </>
        )}
      </div>
      <div>
        <div>
          <strong>Main thread · 30s</strong>
        </div>
        {longTaskSupported === null ? (
          <div>Checking timing support…</div>
        ) : longTaskSupported === false ? (
          <div>Long-task timing unavailable in this browser.</div>
        ) : (
          <>
            <div>
              Tasks ≥100ms:{' '}
              <SeverityValue metricType="longTasks" value={longTaskStats.tasksInLast30Seconds}>
                {longTaskStats.tasksInLast30Seconds}
              </SeverityValue>
            </div>
            <div css={warning?.kind === 'blocking' ? selectedMetricStyles : undefined}>
              Blocking:{' '}
              <SeverityValue metricType="blockingTime" value={longTaskStats.totalBlockingTime}>
                {Math.round(longTaskStats.totalBlockingTime)}ms
              </SeverityValue>
            </div>
            {longTaskStats.worstTaskDuration > 0 && (
              <div css={warning?.kind === 'stall' ? selectedMetricStyles : undefined}>
                <SeverityValue metricType="stall" value={longTaskStats.worstTaskDuration}>
                  Worst: {Math.round(longTaskStats.worstTaskDuration)}ms
                  {warning?.kind === 'stall' && selectedIncidentAge !== null
                    ? ` · ${selectedIncidentAge}s ago`
                    : ''}
                </SeverityValue>
              </div>
            )}
            <div>Blocking counts time beyond 50 ms in tasks lasting at least 100 ms.</div>
          </>
        )}
      </div>
      <div>
        <div>
          <strong>Slow interactions · 30 s</strong>
        </div>
        {inpSupported === null ? (
          <div>Checking timing support…</div>
        ) : inpSupported === false ? (
          <div>Interaction timing unavailable in this browser.</div>
        ) : (
          <>
            <div>Interactions ≥100 ms: {inpStats.slowInteractionsCount}</div>
            {inpStats.slowInteractionsCount === 0 ? (
              <div>No interactions ≥100 ms recorded in this window.</div>
            ) : (
              <>
                <div>
                  Slow-interaction p75:{' '}
                  <SeverityValue metricType="inp" value={inpStats.currentINP}>
                    {Math.round(inpStats.currentINP)}ms
                  </SeverityValue>
                </div>
                <div css={warning?.kind === 'input' ? selectedMetricStyles : undefined}>
                  <SeverityValue metricType="inp" value={inpStats.worstInteractionDelay}>
                    Worst: {Math.round(inpStats.worstInteractionDelay)}ms
                    {warning?.kind === 'input' && selectedIncidentAge !== null
                      ? ` · ${selectedIncidentAge}s ago`
                      : ''}
                  </SeverityValue>
                </div>
                <div>Only interactions ≥100 ms; not the page’s INP.</div>
              </>
            )}
          </>
        )}
      </div>
      {warning && <div>Record the same action in browser DevTools → Performance.</div>}
    </div>
  );

  const triggerAriaLabel = warningReason
    ? `Performance warning: ${warningReason}`
    : 'Performance monitor';
  const measuredHistory = perfInfo?.history ?? [];
  const placeholderCount = Math.max(0, GRAPH_SAMPLE_COUNT - measuredHistory.length);
  const graphBaseline = perfInfo?.baselineFps ?? 60;
  const badgeValue =
    frameSupported === false ? '—' : perfInfo ? `${perfInfo.jankPercentage}%` : '0%';

  return (
    <EuiToolTip content={tooltipContent}>
      <div
        css={getTriggerStyles()}
        tabIndex={0}
        aria-label={triggerAriaLabel}
        onMouseEnter={() => {
          setHovered(true);
          setAgeClock(performance.now());
        }}
        onMouseLeave={() => setHovered(false)}
        onFocus={() => {
          setFocused(true);
          setAgeClock(performance.now());
        }}
        onBlur={() => setFocused(false)}
      >
        <div css={getContainerStyles(euiTheme)} data-test-subj="performanceIndicator">
          <EuiBadge color="default" css={getBadgeStyles()} title={undefined}>
            {warning ? (
              <EuiTextColor color={warning.severity}>Jank {badgeValue}</EuiTextColor>
            ) : (
              <>Jank {badgeValue}</>
            )}
          </EuiBadge>
          <div css={getGraphContainerStyles(euiTheme)}>
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
