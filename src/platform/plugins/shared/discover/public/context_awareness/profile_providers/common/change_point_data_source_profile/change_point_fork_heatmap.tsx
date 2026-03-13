/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useMemo } from 'react';
import { css } from '@emotion/react';
import { EuiFlexGroup, EuiFlexItem, EuiText, useEuiTheme, useEuiFontSize } from '@elastic/eui';
import type {
  ElementClickListener,
  HeatmapElementEvent,
  HeatmapSpec,
  PartialTheme,
  TooltipProps,
} from '@elastic/charts';
import { Chart, Heatmap, ScaleType, Settings, Tooltip } from '@elastic/charts';
import { i18n } from '@kbn/i18n';
import type { TimeRange } from '@kbn/es-query';
import type { ForkBranchSourceQuery } from '@kbn/esql-utils';
import type { ChangePointResult, ChangePointForkHeatmapProps } from './types';
import {
  getBestIntervalFromResults,
  getBucketsFromResults,
  getTimeBucket,
  getTimeBucketsForRange,
} from './helpers';
import { MAX_ENTITY_LABEL_LENGTH, MAX_SELECTED_ENTITIES, Y_AXIS_LABEL_WIDTH } from './constants';

/** Truncate label with ellipsis when exceeding max length. */
function truncateEntityLabel(label: string): string {
  if (label.length <= MAX_ENTITY_LABEL_LENGTH) return label;
  return `${label.slice(0, MAX_ENTITY_LABEL_LENGTH - 3)}...`;
}

/** Sentinel value for empty cells - uses the "no data" color band (1.0–2.0). */
const EMPTY_CELL_VALUE = 1.5;

/** P-value significance categories with discrete colors. */
export const PVALUE_LEGEND_ITEMS = [
  { label: 'Highly Significant (p < 0.01)', color: '#BD271E', min: 0, max: 0.01 },
  { label: 'Moderate (0.01 ≤ p < 0.05)', color: '#E7664C', min: 0.01, max: 0.05 },
  { label: 'Slight (0.05 ≤ p < 0.10)', color: '#F5D371', min: 0.05, max: 0.1 },
  { label: 'Not Significant (p ≥ 0.10)', color: '#D3D3D3', min: 0.1, max: 1 },
] as const;

interface HeatmapDatum {
  x: string;
  y: string;
  value: number;
  entityIndex: number;
}

/**
 * Build heatmap data and metadata for Elastic Charts.
 * When timeRange is provided, columns span the full date range at the best interval derived from results.
 */
function buildHeatmapData(
  results: ChangePointResult[],
  forkBranches: ForkBranchSourceQuery[],
  timeRange?: TimeRange
): {
  entityIndicesWithChangePoints: number[];
  timeBuckets: Array<{ key: string; label: string }>;
  data: HeatmapDatum[];
} {
  const allEntityLabels = forkBranches.map((b) => b.branchLabel);
  const validResults = results.filter((r) => {
    if (r.forkIndex === undefined || r.forkIndex < 0 || r.forkIndex >= allEntityLabels.length)
      return false;
    if (r.pvalue == null) return false;
    return true;
  });

  const resultsWithPvalue = results.filter((r) => r.pvalue != null && r.timestamp);
  const useFallback =
    validResults.length === 0 && resultsWithPvalue.length > 0 && allEntityLabels.length === 1;
  const resultsToUse = useFallback ? resultsWithPvalue : validResults;

  const interval = getBestIntervalFromResults(resultsToUse);
  const timeBuckets =
    timeRange?.from && timeRange?.to
      ? getTimeBucketsForRange(timeRange, interval)
      : getBucketsFromResults(resultsToUse, interval);

  const grid = new Map<string, number>();
  for (const r of resultsToUse) {
    if (r.pvalue == null) continue;
    const fi = useFallback ? 0 : r.forkIndex ?? 0;
    const { key } = getTimeBucket(r.timestamp, interval);
    const cellKey = `${fi}-${key}`;
    const existing = grid.get(cellKey);
    const pval = r.pvalue;
    if (existing == null || pval < existing) {
      grid.set(cellKey, pval);
    }
  }

  const entityIndicesWithChangePoints = [
    ...new Set(
      [...grid.keys()]
        .map((k) => {
          const dashIdx = k.indexOf('-');
          return dashIdx >= 0 ? parseInt(k.slice(0, dashIdx), 10) : -1;
        })
        .filter((i) => i >= 0 && i < forkBranches.length)
    ),
  ].sort((a, b) => a - b);

  const data: HeatmapDatum[] = [];
  for (const entityIdx of entityIndicesWithChangePoints) {
    const yLabel = forkBranches[entityIdx]?.branchLabel ?? '';
    for (const { key } of timeBuckets) {
      const pvalue = grid.get(`${entityIdx}-${key}`);
      data.push({
        x: key,
        y: yLabel,
        value: pvalue != null ? pvalue : EMPTY_CELL_VALUE,
        entityIndex: entityIdx,
      });
    }
  }

  return { entityIndicesWithChangePoints, timeBuckets, data };
}

/** Custom tooltip for p-value heatmap cells; shows full entity name on hover. */
interface TooltipTheme {
  backgroundColor: string;
  color: string;
}

const createChangePointHeatmapTooltip =
  (tooltipTheme: TooltipTheme): NonNullable<TooltipProps['customTooltip']> =>
  ({ values }) => {
    if (values.length === 0) return null;
    const entityLabel = values.length >= 2 ? String(values[1]?.value ?? '') : '';
    const cellOrFirst = values.length >= 3 ? values[2] : values[0];
    const rawVal = (cellOrFirst as { value?: unknown })?.value;
    const isEmpty = rawVal === EMPTY_CELL_VALUE;
    const pvalueLabel = i18n.translate('discover.contextAwareness.changePointHeatmap.pvalueLabel', {
      defaultMessage: 'p-value',
    });
    const pvalueDisplay = isEmpty
      ? i18n.translate('discover.contextAwareness.changePointHeatmap.noData', {
          defaultMessage: 'No change point',
        })
      : String(rawVal);
    const entityLabelTitle = i18n.translate(
      'discover.contextAwareness.changePointHeatmap.entityLabel',
      { defaultMessage: 'Entity' }
    );
    return (
      <div
        style={{
          padding: 8,
          backgroundColor: tooltipTheme.backgroundColor,
          color: tooltipTheme.color,
          borderRadius: 4,
        }}
      >
        {entityLabel ? (
          <div style={{ display: 'flex', gap: 8, marginBottom: 4 }}>
            <span>{entityLabelTitle}:</span>
            <span>{entityLabel}</span>
          </div>
        ) : null}
        <div style={{ display: 'flex', gap: 8 }}>
          <span>{pvalueLabel}:</span>
          <span>{pvalueDisplay}</span>
        </div>
      </div>
    );
  };

export const ChangePointForkHeatmap: React.FC<ChangePointForkHeatmapProps> = ({
  results,
  forkBranches,
  selectedEntityIndices,
  onSelectEntity,
  renderEntityDetailChart,
  timeRange,
  charts,
}) => {
  const { euiTheme } = useEuiTheme();
  const baseTheme = charts.theme.useChartsBaseTheme();
  const euiFontSizeXS = useEuiFontSize('xs', { unit: 'px' }).fontSize as string;

  const toggleEntitySelection = useCallback(
    (entityIdx: number) => {
      const isSelected = selectedEntityIndices.includes(entityIdx);
      if (isSelected) {
        onSelectEntity(selectedEntityIndices.filter((i) => i !== entityIdx));
      } else if (selectedEntityIndices.length < MAX_SELECTED_ENTITIES) {
        onSelectEntity([...selectedEntityIndices, entityIdx].sort((a, b) => a - b));
      }
    },
    [selectedEntityIndices, onSelectEntity]
  );

  const { entityIndicesWithChangePoints, timeBuckets, data } = useMemo(
    () => buildHeatmapData(results, forkBranches, timeRange),
    [results, forkBranches, timeRange]
  );

  const highlightedData: HeatmapSpec['highlightedData'] = useMemo(() => {
    if (selectedEntityIndices.length === 0) return undefined;
    const selectedLabels = selectedEntityIndices
      .map((i) => forkBranches[i]?.branchLabel)
      .filter(Boolean);
    if (selectedLabels.length === 0) return undefined;
    return {
      x: timeBuckets.map((t) => t.key),
      y: selectedLabels,
    };
  }, [selectedEntityIndices, forkBranches, timeBuckets]);

  const onElementClick = useCallback(
    (events: HeatmapElementEvent[]) => {
      if (events.length === 0) return;
      const event = events[0];
      const cell = event[0];
      const datum = cell.datum as unknown as HeatmapDatum;
      const entityIdx =
        datum.entityIndex ?? forkBranches.findIndex((b) => b.branchLabel === datum.y);
      if (entityIdx >= 0) {
        toggleEntitySelection(entityIdx);
      }
    },
    [toggleEntitySelection, forkBranches]
  ) as ElementClickListener;

  const themeOverrides = useMemo<PartialTheme>(
    () => ({
      background: {
        color: euiTheme.colors.backgroundBasePlain,
      },
      heatmap: {
        grid: {
          stroke: {
            width: 1,
            color: euiTheme.border.color,
          },
        },
        cell: {
          maxWidth: 'fill',
          maxHeight: 'fill',
          label: {
            visible: false,
          },
          border: {
            stroke: euiTheme.colors.borderBasePlain,
            strokeWidth: 0,
          },
        },
        yAxisLabel: {
          visible: true,
          width: Y_AXIS_LABEL_WIDTH,
          textColor: euiTheme.colors.textSubdued,
          fontSize: parseInt(euiFontSizeXS, 10),
        },
        xAxisLabel: {
          visible: true,
          textColor: euiTheme.colors.textSubdued,
          fontSize: parseInt(euiFontSizeXS, 10),
        },
      },
    }),
    [euiTheme, euiFontSizeXS]
  );

  const tooltipOptions = useMemo<TooltipProps>(
    () => ({
      placement: 'auto',
      fallbackPlacements: ['left'],
      boundary: 'chart',
      customTooltip: createChangePointHeatmapTooltip({
        backgroundColor: euiTheme.colors.darkestShade,
        color: euiTheme.colors.emptyShade,
      }),
    }),
    [euiTheme.colors.darkestShade, euiTheme.colors.emptyShade]
  );

  if (entityIndicesWithChangePoints.length === 0 || timeBuckets.length === 0) {
    return null;
  }

  const chartHeight = Math.max(120, entityIndicesWithChangePoints.length * 28 + 60);

  return (
    <EuiFlexGroup direction="column" gutterSize="s">
      <EuiFlexItem grow={false}>
        <EuiFlexGroup
          justifyContent="flexEnd"
          alignItems="center"
          gutterSize="xs"
          wrap
          data-test-subj="changePointHeatmapLegend"
        >
          {PVALUE_LEGEND_ITEMS.map((item, idx) => (
            <EuiFlexItem key={idx} grow={false}>
              <EuiFlexGroup alignItems="center" gutterSize="xs">
                <div
                  css={css({
                    width: 12,
                    height: 12,
                    borderRadius: 2,
                    backgroundColor: item.color,
                  })}
                />
                <EuiText size="xs">{item.label}</EuiText>
              </EuiFlexGroup>
            </EuiFlexItem>
          ))}
          <EuiFlexItem grow={false}>
            <EuiFlexGroup alignItems="center" gutterSize="xs">
              <div
                css={css({
                  width: 12,
                  height: 12,
                  borderRadius: 2,
                  backgroundColor: euiTheme.colors.backgroundBasePlain,
                  border: `1px solid ${euiTheme.border.color}`,
                })}
              />
              <EuiText size="xs">
                {i18n.translate('discover.contextAwareness.changePointHeatmap.noDataLegend', {
                  defaultMessage: 'No change point',
                })}
              </EuiText>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <div
          css={css({
            overflowX: 'auto',
            padding: euiTheme.size.s,
            backgroundColor: euiTheme.colors.backgroundBaseSubdued,
            borderRadius: euiTheme.border.radius.medium,
          })}
          data-test-subj="changePointForkHeatmap"
        >
          <Chart size={{ height: chartHeight }}>
            <Tooltip {...tooltipOptions} />
            <Settings
              theme={themeOverrides}
              baseTheme={baseTheme}
              onElementClick={onElementClick}
              showLegend={false}
              locale={i18n.getLocale()}
            />
            <Heatmap
              id="change-point-heatmap"
              timeZone="UTC"
              colorScale={{
                type: 'bands',
                bands: [
                  { start: 0, end: 0.01, color: PVALUE_LEGEND_ITEMS[0].color },
                  { start: 0.01, end: 0.05, color: PVALUE_LEGEND_ITEMS[1].color },
                  { start: 0.05, end: 0.1, color: PVALUE_LEGEND_ITEMS[2].color },
                  { start: 0.1, end: 1, color: PVALUE_LEGEND_ITEMS[3].color },
                  {
                    start: 1,
                    end: 2,
                    color: euiTheme.colors.backgroundBasePlain,
                    label: i18n.translate('discover.contextAwareness.changePointHeatmap.noData', {
                      defaultMessage: 'No change point',
                    }),
                  },
                ],
              }}
              data={data}
              xAccessor="x"
              yAccessor="y"
              valueAccessor="value"
              valueFormatter={(v) =>
                v === EMPTY_CELL_VALUE ? '—' : v < 0.01 ? v.toExponential(1) : v.toFixed(2)
              }
              xScale={{ type: ScaleType.Ordinal }}
              xSortPredicate="dataIndex"
              ySortPredicate="dataIndex"
              highlightedData={highlightedData}
              xAxisTitle=""
              xAxisLabelName=""
              xAxisLabelFormatter={(v) => {
                const bucket = timeBuckets.find((t) => t.key === v);
                return bucket?.label ?? String(v);
              }}
              yAxisTitle=""
              yAxisLabelName=""
              yAxisLabelFormatter={(v) => truncateEntityLabel(String(v))}
            />
          </Chart>
        </div>
      </EuiFlexItem>
      {selectedEntityIndices.length > 0 ? (
        <EuiFlexItem grow={false}>
          <EuiFlexGroup wrap gutterSize="m" css={css({ alignContent: 'flex-start' })}>
            {selectedEntityIndices.map((entityIdx) => (
              <EuiFlexItem
                key={entityIdx}
                css={css({
                  minHeight: 200,
                  width: '33.333%',
                  minWidth: 280,
                  maxWidth: 400,
                })}
              >
                <div
                  css={css({
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: euiTheme.size.xs,
                  })}
                >
                  <EuiText
                    size="xs"
                    css={css({
                      fontWeight: 600,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    })}
                    title={forkBranches[entityIdx]?.branchLabel ?? ''}
                  >
                    {truncateEntityLabel(forkBranches[entityIdx]?.branchLabel ?? '')}
                  </EuiText>
                  <div
                    css={css({
                      flex: 1,
                      minHeight: 180,
                      position: 'relative',
                      '& > div': { height: '100%', position: 'absolute', width: '100%' },
                    })}
                    data-test-subj={`changePointEntityDetailChart-${entityIdx}`}
                  >
                    {renderEntityDetailChart(entityIdx)}
                  </div>
                </div>
              </EuiFlexItem>
            ))}
          </EuiFlexGroup>
        </EuiFlexItem>
      ) : null}
    </EuiFlexGroup>
  );
};
