/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  EuiBadge,
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHealth,
  EuiHorizontalRule,
  EuiIcon,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import type {
  TraceServiceColor,
  TraceServiceLegendEntry,
  TraceSpan,
  TraceSpanType,
  TracesTabData,
} from './fake_entity_tabs';

interface TracesTabProps {
  readonly traces: TracesTabData;
}

/**
 * Number of vertical guide lines / tick labels rendered along the time
 * axis (matches the inspiration screenshot's 0/200/400/600/800/total
 * cadence). Kept fixed so the axis CSS can use simple percentages.
 */
const AXIS_TICK_COUNT = 5;

/**
 * Per-depth horizontal offset applied to the chevron icon inside the
 * fixed-width tree column. Kept tight (well under the chevron's own
 * width) so a depth-3 span still fits the column without overflowing.
 */
const DEPTH_INDENT_PX = 8;

/**
 * Fixed total width of the leftmost "tree" column that hosts the
 * collapse chevron, the child-count badge, and the per-depth indent.
 * Held constant across rows so every bar area below it shares the same
 * pixel width — and therefore the same timeline scale — regardless of
 * the row's depth.
 */
const TREE_COLUMN_PX = 80;

/**
 * Minimum on-screen width of the waterfall body. The flyout is narrow,
 * so we let the panel scroll horizontally rather than crushing the bars
 * — the layout below uses `min-width: INNER_MIN_WIDTH_PX` on the inner
 * element wrapped by an `overflow-x: auto` container.
 */
const INNER_MIN_WIDTH_PX = 1100;

/**
 * Pixel gutter reserved to the right of each bar track for trailing
 * span labels (HTTP status / name / duration / badges). The bar % math
 * is applied to `(width - LABEL_GUTTER_PX)` so a span finishing at
 * 100% of the timeline still has dedicated room for its label without
 * the text being clipped at the panel's right edge.
 */
const LABEL_GUTTER_PX = 280;

/**
 * Render the curated APM-style trace waterfall under the Traces tab.
 *
 * The component is deliberately self-contained — no `@elastic/charts`
 * dependency, no real APM integration — because every payload is a
 * hard-coded mock (see `tracesByHealth` in `kind_templates.ts` and the
 * PayFlow story constants in `payflow_story.ts`). The collapse state
 * lives in local component state so it resets when the user navigates to
 * a different entity (the parent flyout swaps `traces` whole).
 */
export const TracesTab = ({ traces }: TracesTabProps) => {
  const { euiTheme } = useEuiTheme();

  // Resolve a service id back to its legend colour token. Memoised so
  // span rows don't rebuild the lookup on every render.
  const serviceColorById = useMemo(() => {
    const map = new Map<string, TraceServiceColor>();
    for (const service of traces.services) {
      map.set(service.id, service.color);
    }
    return map;
  }, [traces.services]);

  // Pre-compute a parent → children index so the chevron toggles can hide
  // entire subtrees in O(1). The recursive walk in `flatRows` reads from
  // this map.
  const childrenByParent = useMemo(() => {
    const map = new Map<string | undefined, TraceSpan[]>();
    for (const span of traces.spans) {
      const list = map.get(span.parentId);
      if (list) {
        list.push(span);
      } else {
        map.set(span.parentId, [span]);
      }
    }
    return map;
  }, [traces.spans]);

  // Default state: every parent expanded so the first paint matches the
  // inspiration screenshot. Stored as a `Set` of *collapsed* ids so the
  // empty default keeps everything open without a separate seeding pass.
  const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(() => new Set());

  const toggleCollapsed = useCallback((id: string) => {
    setCollapsed((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  // Walk the span tree and emit visible rows in render order. Hidden
  // (collapsed) subtrees are skipped here rather than at render time so
  // the keyboard-tab order stays correct.
  const flatRows = useMemo<Array<{ span: TraceSpan; depth: number; childCount: number }>>(() => {
    const out: Array<{ span: TraceSpan; depth: number; childCount: number }> = [];
    const visit = (parentId: string | undefined, depth: number) => {
      const children = childrenByParent.get(parentId);
      if (!children) return;
      for (const span of children) {
        const grandchildren = childrenByParent.get(span.id) ?? [];
        out.push({ span, depth, childCount: grandchildren.length });
        if (grandchildren.length > 0 && !collapsed.has(span.id)) {
          visit(span.id, depth + 1);
        }
      }
    };
    visit(undefined, 0);
    return out;
  }, [childrenByParent, collapsed]);

  return (
    <div data-test-subj="entityCentricLabFlyoutTracesTab">
      <ServicesLegend services={traces.services} />
      <EuiSpacer size="m" />
      <EuiPanel hasBorder paddingSize="m">
        <div
          // Horizontal scroll wrapper: the flyout is narrower than the
          // typical APM waterfall so we let the panel body scroll rather
          // than letting trailing span labels clip at the right edge.
          css={css`
            overflow-x: auto;
          `}
          data-test-subj="entityCentricLabFlyoutTracesScrollContainer"
        >
          <div
            // Inner content with a guaranteed minimum width so the bar
            // tracks and trailing labels have stable room. When the
            // flyout is wide enough this `min-width` is satisfied by the
            // viewport and the scrollbar stays hidden.
            css={css`
              min-width: ${INNER_MIN_WIDTH_PX}px;
            `}
          >
            <TimeAxis totalDurationMs={traces.totalDurationMs} />
            <EuiHorizontalRule margin="s" />
            <div data-test-subj="entityCentricLabFlyoutTracesWaterfall">
              {flatRows.map(({ span, depth, childCount }) => (
                <SpanRow
                  key={span.id}
                  span={span}
                  depth={depth}
                  childCount={childCount}
                  isCollapsed={collapsed.has(span.id)}
                  onToggleCollapse={toggleCollapsed}
                  totalDurationMs={traces.totalDurationMs}
                  serviceColor={serviceColorById.get(span.serviceId) ?? 'primary'}
                />
              ))}
            </div>
          </div>
        </div>
      </EuiPanel>
      <EuiSpacer size="s" />
      <EuiFlexGroup justifyContent="flexEnd" responsive={false} gutterSize="none">
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            iconType="popout"
            iconSide="right"
            size="s"
            // No-op handler — matches the lab's other "View in <app>"
            // affordances (e.g. logs / metrics) which are visual-only.
            onClick={() => undefined}
            data-test-subj="entityCentricLabFlyoutTracesViewInApm"
            css={css`
              color: ${euiTheme.colors.primaryText};
            `}
          >
            {i18n.translate('entityCentricLabFlyout.tracesTab.viewInApm', {
              defaultMessage: 'View all traces in APM',
            })}
          </EuiButtonEmpty>
        </EuiFlexItem>
      </EuiFlexGroup>
    </div>
  );
};

interface ServicesLegendProps {
  readonly services: readonly TraceServiceLegendEntry[];
}

const ServicesLegend = ({ services }: ServicesLegendProps) => (
  <EuiFlexGroup
    alignItems="center"
    gutterSize="m"
    responsive={false}
    data-test-subj="entityCentricLabFlyoutTracesLegend"
  >
    <EuiFlexItem grow={false}>
      <EuiTitle size="xxs">
        <h4>
          {i18n.translate('entityCentricLabFlyout.tracesTab.servicesLegendLabel', {
            defaultMessage: 'Services',
          })}
        </h4>
      </EuiTitle>
    </EuiFlexItem>
    {services.map((service) => (
      <EuiFlexItem grow={false} key={service.id}>
        <EuiHealth color={service.color}>
          <EuiText size="s">{service.name}</EuiText>
        </EuiHealth>
      </EuiFlexItem>
    ))}
  </EuiFlexGroup>
);

interface TimeAxisProps {
  readonly totalDurationMs: number;
}

const TimeAxis = ({ totalDurationMs }: TimeAxisProps) => {
  const { euiTheme } = useEuiTheme();
  const ticks = useMemo(() => {
    const out: number[] = [];
    for (let i = 0; i < AXIS_TICK_COUNT; i++) {
      out.push(Math.round((totalDurationMs * i) / (AXIS_TICK_COUNT - 1)));
    }
    return out;
  }, [totalDurationMs]);

  return (
    <EuiFlexGroup
      responsive={false}
      gutterSize="none"
      alignItems="center"
      css={css`
        // Left padding matches the fixed tree column on each row (so
        // tick "0" sits flush with the bar-track origin) and the right
        // padding matches LABEL_GUTTER_PX so the rightmost tick aligns
        // with the bar-track terminator rather than the trailing-label
        // gutter.
        padding-left: ${TREE_COLUMN_PX}px;
        padding-right: ${LABEL_GUTTER_PX}px;
        color: ${euiTheme.colors.textSubdued};
      `}
      data-test-subj="entityCentricLabFlyoutTracesAxis"
    >
      {ticks.map((tick, idx) => (
        <EuiFlexItem
          // Last tick aligns to the right edge so the total reads like
          // `999 ms` flush with the right-hand bar terminator.
          key={tick}
          css={css`
            text-align: ${idx === 0 ? 'left' : idx === ticks.length - 1 ? 'right' : 'center'};
          `}
        >
          <EuiText size="xs" color="subdued">
            {formatDuration(tick)}
          </EuiText>
        </EuiFlexItem>
      ))}
    </EuiFlexGroup>
  );
};

interface SpanRowProps {
  readonly span: TraceSpan;
  readonly depth: number;
  readonly childCount: number;
  readonly isCollapsed: boolean;
  readonly onToggleCollapse: (id: string) => void;
  readonly totalDurationMs: number;
  readonly serviceColor: TraceServiceColor;
}

const SpanRow = ({
  span,
  depth,
  childCount,
  isCollapsed,
  onToggleCollapse,
  totalDurationMs,
  serviceColor,
}: SpanRowProps) => {
  const { euiTheme } = useEuiTheme();

  // Bar geometry — guard against a zero-duration root which would
  // otherwise divide by zero and emit `NaN%`.
  const safeTotal = Math.max(1, totalDurationMs);
  const leftPct = (span.startMs / safeTotal) * 100;
  const widthPct = Math.max((span.durationMs / safeTotal) * 100, 0.5);

  const barColor = colorTokenForService(serviceColor, euiTheme);

  return (
    <EuiFlexGroup
      gutterSize="none"
      alignItems="center"
      responsive={false}
      data-test-subj={`entityCentricLabFlyoutTracesSpan-${span.id}`}
      css={css`
        padding: ${euiTheme.size.xs} 0;
      `}
    >
      <EuiFlexItem
        grow={false}
        // Fixed-width tree column. Holds the depth indent + chevron +
        // child-count badge in a single inline cluster so the bar area
        // beside it has the same width on every row regardless of the
        // span's depth in the trace tree. Without this, a flex-only
        // layout caused depth padding to eat into the bar coordinate
        // space, breaking timeline alignment with the axis above.
        css={css`
          width: ${TREE_COLUMN_PX}px;
          flex-shrink: 0;
          display: flex;
          align-items: center;
          gap: ${euiTheme.size.xs};
          padding-left: ${depth * DEPTH_INDENT_PX}px;
          color: ${euiTheme.colors.textSubdued};
          // Clip if a future trace ever exceeds the assumed max depth —
          // better to truncate the chevron than to push the bar area.
          overflow: hidden;
        `}
      >
        <span
          css={css`
            display: inline-flex;
            justify-content: flex-end;
            width: 16px;
            flex-shrink: 0;
          `}
        >
          {childCount > 0 ? (
            <EuiButtonIcon
              iconType={isCollapsed ? 'arrowRight' : 'arrowDown'}
              size="xs"
              color="text"
              onClick={() => onToggleCollapse(span.id)}
              aria-label={
                isCollapsed
                  ? i18n.translate('entityCentricLabFlyout.tracesTab.expandSpan', {
                      defaultMessage: 'Expand {name}',
                      values: { name: span.name },
                    })
                  : i18n.translate('entityCentricLabFlyout.tracesTab.collapseSpan', {
                      defaultMessage: 'Collapse {name}',
                      values: { name: span.name },
                    })
              }
              data-test-subj={`entityCentricLabFlyoutTracesSpanToggle-${span.id}`}
            />
          ) : null}
        </span>
        <span
          css={css`
            display: inline-flex;
            flex-shrink: 0;
          `}
        >
          {childCount > 0 ? (
            <EuiBadge
              color="hollow"
              data-test-subj={`entityCentricLabFlyoutTracesChildCount-${span.id}`}
            >
              {childCount}
            </EuiBadge>
          ) : null}
        </span>
      </EuiFlexItem>
      <EuiFlexItem
        grow={true}
        css={css`
          position: relative;
          min-height: 24px;
        `}
      >
        <div
          // Inner timeline track. Sized as `width: calc(100% - LABEL_GUTTER_PX)`
          // so the bar coordinate system covers everything except the
          // trailing-label gutter. Bars and labels are positioned
          // absolutely against this track; labels at `left: 100%+6px`
          // render in the parent EuiFlexItem's overflow area (which
          // extends LABEL_GUTTER_PX further to the right). The
          // `repeating-linear-gradient` paints the same vertical guide
          // lines as the time axis ticks above.
          css={css`
            position: relative;
            height: 100%;
            width: calc(100% - ${LABEL_GUTTER_PX}px);
            background: repeating-linear-gradient(
              to right,
              transparent 0,
              transparent calc(${100 / (AXIS_TICK_COUNT - 1)}% - 1px),
              ${euiTheme.colors.lightShade} calc(${100 / (AXIS_TICK_COUNT - 1)}% - 1px),
              ${euiTheme.colors.lightShade} ${100 / (AXIS_TICK_COUNT - 1)}%
            );
          `}
        >
          <div
            css={css`
              position: absolute;
              top: 50%;
              transform: translateY(-50%);
              left: ${leftPct}%;
              width: ${widthPct}%;
              min-width: 2px;
              height: 14px;
              background: ${barColor};
              border-radius: 2px;
            `}
            data-test-subj={`entityCentricLabFlyoutTracesSpanBar-${span.id}`}
          />
          <div
            // Label rendered to the right of the bar so the long
            // durations and badges from the screenshot stay readable
            // even when the bar itself is tiny (sub-millisecond spans).
            // The track's `overflow: visible` lets the label spill into
            // the LABEL_GUTTER_PX area reserved by the outer flex item.
            css={css`
              position: absolute;
              top: 50%;
              transform: translateY(-50%);
              left: calc(${leftPct + widthPct}% + 6px);
              display: flex;
              align-items: center;
              gap: ${euiTheme.size.xs};
              white-space: nowrap;
            `}
          >
            <SpanLabel span={span} />
          </div>
        </div>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

const SpanLabel = ({ span }: { readonly span: TraceSpan }) => (
  <>
    <EuiIcon type={iconForSpanType(span.type)} size="s" aria-hidden={true} />
    {span.statusCode ? (
      <EuiBadge color="hollow">
        {i18n.translate('entityCentricLabFlyout.tracesTab.httpStatusBadge', {
          defaultMessage: 'HTTP {code}',
          values: { code: span.statusCode },
        })}
      </EuiBadge>
    ) : null}
    <EuiText size="s">
      <strong>{span.name}</strong>
    </EuiText>
    {span.errorCount && span.errorCount > 0 ? (
      <EuiBadge color="danger">
        {i18n.translate('entityCentricLabFlyout.tracesTab.errorBadge', {
          defaultMessage: '{count, plural, one {# Error} other {# Errors}}',
          values: { count: span.errorCount },
        })}
      </EuiBadge>
    ) : null}
    {span.extraBadge ? <EuiBadge color="warning">{span.extraBadge}</EuiBadge> : null}
    <EuiText size="xs" color="subdued">
      {formatDuration(span.durationMs)}
    </EuiText>
  </>
);

const iconForSpanType = (type: TraceSpanType): string => {
  switch (type) {
    case 'browser':
      return 'globe';
    case 'http':
      return 'link';
    case 'db':
      return 'database';
    case 'render':
      return 'visText';
    case 'asset':
      return 'document';
    case 'event':
      return 'bell';
    default:
      return 'dot';
  }
};

/**
 * Resolve a service-legend colour token to a concrete CSS colour from the
 * EUI theme so the absolute-positioned waterfall bars don't depend on EUI
 * components mid-render. Falls back to the primary hue for unknown
 * tokens; today the {@link TraceServiceColor} union is closed so the
 * fallback is unreachable but keeps the function total.
 */
const colorTokenForService = (
  color: TraceServiceColor,
  euiTheme: ReturnType<typeof useEuiTheme>['euiTheme']
): string => {
  switch (color) {
    case 'success':
      return euiTheme.colors.success;
    case 'accent':
      return euiTheme.colors.accent;
    case 'warning':
      return euiTheme.colors.warning;
    case 'danger':
      return euiTheme.colors.danger;
    case 'primary':
    default:
      return euiTheme.colors.primary;
  }
};

/**
 * Format a span duration as `999 ms` for ≥ 1 ms or `1,000 µs` for sub-
 * millisecond spans (mirrors the inspiration screenshot's `Fire 'load'
 * event 1,000 μs` row). The unit picks the larger denomination so totals
 * read naturally without rounding to `0 ms`.
 */
const formatDuration = (ms: number): string => {
  if (ms >= 1) {
    return i18n.translate('entityCentricLabFlyout.tracesTab.duration.ms', {
      defaultMessage: '{value} ms',
      values: { value: ms.toLocaleString() },
    });
  }
  const micros = Math.max(1, Math.round(ms * 1000));
  return i18n.translate('entityCentricLabFlyout.tracesTab.duration.us', {
    defaultMessage: '{value} \u00B5s',
    values: { value: micros.toLocaleString() },
  });
};
