/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { css } from '@emotion/react';
import {
  EuiFlexGrid,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingChart,
  EuiPanel,
  EuiSelect,
  EuiSpacer,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { isOfAggregateQueryType } from '@kbn/es-query';
import type { TypedLensByValueInput } from '@kbn/lens-plugin/public';
import { ChartType, getLensAttributesFromSuggestion } from '@kbn/visualization-utils';
import {
  getSourceQueryBeforeChangePoint,
  getSourceQueriesFromForkWithChangePoint,
  getChangePointOutputColumnNames,
  getESQLQueryColumns,
} from '@kbn/esql-utils';
import { useDiscoverServices } from '../../../../hooks/use_discover_services';
import { ChangePointBurstHistogram } from './change_point_burst_histogram';
import { ChangePointForkHeatmap } from './change_point_fork_heatmap';
import {
  applyLineChartStyleToDataLayers,
  deriveEntityAttributes,
  formatChangePointAnnotationLabel,
  getBurstDetectionHistogram,
  getChangePointResultsFromTable,
  getTimeColumnId,
  getValueColumnId,
} from './helpers';
import { CHANGE_POINT_TOOLTIP_ANNOTATION_LAYER_ID, FORK_COLUMN_ID } from './constants';
import type { ChangePointResult, ChangePointExperienceViewProps, DataLayerLike } from './types';

/**
 * Custom chart section view shown when the ES|QL query contains CHANGE_POINT.
 * Containes multiple view modes including line charts of the source data with change point annotations,
 * similar to the AIOps change point detection UI.
 */
export const ChangePointExperienceView: React.FC<ChangePointExperienceViewProps> = ({
  histogramCss,
  chartToolbarCss,
  renderToggleActions,
  isComponentVisible,
  fetchParams,
  services,
  onBrushEnd,
  onFilter,
}) => {
  const { data, lens } = services;
  const { charts } = useDiscoverServices();
  const { euiTheme } = useEuiTheme();
  const [lensAttributes, setLensAttributes] = useState<TypedLensByValueInput['attributes'] | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const columns = useMemo(
    () =>
      fetchParams.columns ?? (fetchParams.columnsMap ? Object.values(fetchParams.columnsMap) : []),
    [fetchParams.columns, fetchParams.columnsMap]
  );

  // The bridge between the ES|QL CHANGE_POINT output and the table columns used for charts and heatmaps
  const changePointColumnNames = useMemo(() => {
    const query = fetchParams.query as { esql?: string } | undefined;
    return query?.esql ? getChangePointOutputColumnNames(query.esql) : undefined;
  }, [fetchParams.query]);

  const sourceQuery = useMemo(() => {
    const query = fetchParams.query as { esql?: string } | undefined;
    return query?.esql ? getSourceQueryBeforeChangePoint(query.esql) : undefined;
  }, [fetchParams.query]);

  // The array of source queries for each fork branch
  const forkBranchQueries = useMemo(() => {
    const query = fetchParams.query as { esql?: string } | undefined;
    return query?.esql ? getSourceQueriesFromForkWithChangePoint(query.esql) : undefined;
  }, [fetchParams.query]);

  const multipleEntityMode = Boolean(forkBranchQueries?.length);

  const [viewMode, setViewMode] = useState<
    'heatmap' | 'line' | 'multiple-line' | 'burst-detection'
  >('multiple-line');
  const [selectedEntityIndices, setSelectedEntityIndices] = useState<number[]>([]);

  useEffect(() => {
    if (forkBranchQueries && selectedEntityIndices.length > 0) {
      const valid = selectedEntityIndices.filter((i) => i < forkBranchQueries.length);
      if (valid.length !== selectedEntityIndices.length) {
        setSelectedEntityIndices(valid);
      }
    }
  }, [selectedEntityIndices, forkBranchQueries]);

  const sourceColumns = useMemo(() => {
    if (!changePointColumnNames) return columns;
    return columns.filter(
      (c) =>
        c.id !== changePointColumnNames.typeColumn && c.id !== changePointColumnNames.pvalueColumn
    );
  }, [columns, changePointColumnNames]);

  const heatmapResults = useMemo((): ChangePointResult[] => {
    const table = fetchParams.table;
    if (!table?.rows?.length || !multipleEntityMode || !forkBranchQueries?.length) return [];
    const colsToUse = table.columns?.length ? table.columns : columns;
    const timeColumnId = getTimeColumnId(colsToUse);
    const typeColumnId = changePointColumnNames?.typeColumn;
    const pvalueColumnId = changePointColumnNames?.pvalueColumn;
    const valueColumnId = timeColumnId
      ? getValueColumnId(colsToUse, timeColumnId, typeColumnId, pvalueColumnId)
      : undefined;
    if (!timeColumnId || !valueColumnId) return [];
    return getChangePointResultsFromTable(
      table,
      timeColumnId,
      typeColumnId,
      pvalueColumnId,
      valueColumnId,
      FORK_COLUMN_ID,
      forkBranchQueries
    );
  }, [fetchParams.table, multipleEntityMode, forkBranchQueries, columns, changePointColumnNames]);

  const entityLabels = useMemo(
    () => forkBranchQueries?.map((b) => b.branchLabel) ?? [],
    [forkBranchQueries]
  );

  const burstDetectionHistogramData = useMemo(() => {
    if (!multipleEntityMode || !forkBranchQueries?.length || heatmapResults.length === 0) return [];
    return getBurstDetectionHistogram(heatmapResults, entityLabels, fetchParams.timeRange);
  }, [heatmapResults, forkBranchQueries, multipleEntityMode, entityLabels, fetchParams.timeRange]);

  const entityAttributesMap = useMemo(() => {
    if (!lensAttributes || !multipleEntityMode || !forkBranchQueries) return {};
    const dataViewId = fetchParams.dataView?.id ?? '';
    const forkLineColors = [
      euiTheme.colors.borderBaseProminent,
      euiTheme.colors.primary,
      euiTheme.colors.accent,
      euiTheme.colors.success,
      euiTheme.colors.warning,
    ];
    const map: Record<number, TypedLensByValueInput['attributes']> = {};
    for (let i = 0; i < forkBranchQueries.length; i++) {
      const entityResults = heatmapResults.filter(
        (r) => r.forkIndex === i || r.forkIndex === forkBranchQueries[i].branchIndex
      );
      const attrs = deriveEntityAttributes(
        lensAttributes,
        i,
        entityResults,
        forkBranchQueries[i].branchLabel,
        dataViewId,
        forkLineColors
      );
      if (attrs) map[i] = attrs;
    }
    return map;
  }, [
    lensAttributes,
    multipleEntityMode,
    forkBranchQueries,
    heatmapResults,
    fetchParams.dataView?.id,
    euiTheme.colors,
  ]);

  useEffect(() => {
    let cancelled = false;
    setError(null);

    // Creates Lens attributes for a line chart of the source data with change point annotations, then stores them in lensAttributes via setLensAttributes
    const loadXYAttributes = async () => {
      if (
        !fetchParams.isESQLQuery ||
        !isOfAggregateQueryType(fetchParams.query) ||
        !fetchParams.dataView
      ) {
        setLensAttributes(null);
        setIsLoading(false);
        return;
      }

      const forkBranches = forkBranchQueries;
      const isForkMode = Boolean(forkBranches?.length);
      const effectiveSourceQuery = isForkMode ? forkBranches?.[0]?.sourceQuery : sourceQuery;

      if (!effectiveSourceQuery && !isForkMode) {
        setLensAttributes(null);
        setError('Could not derive source query for change point');
        setIsLoading(false);
        return;
      }

      if (!isForkMode && !sourceColumns.length) {
        setLensAttributes(null);
        setIsLoading(false);
        return;
      }

      try {
        const stateHelper = await lens.stateHelperApi();
        const dataViewSpec = fetchParams.dataView.toSpec();
        const timeRange = fetchParams.timeRange;

        let attributes: TypedLensByValueInput['attributes'];

        if (isForkMode && forkBranches) {
          const branchColumns = await Promise.all(
            forkBranches.map((branch) =>
              getESQLQueryColumns({
                esqlQuery: branch.sourceQuery,
                search: data.search.search,
                signal: fetchParams.abortController?.signal,
                timeRange: timeRange
                  ? { from: timeRange.from, to: timeRange.to }
                  : data.query.timefilter.timefilter.getAbsoluteTime(),
              })
            )
          );

          if (cancelled) return;

          const validBranches = forkBranches
            .map((branch, i) => ({ branch, cols: branchColumns[i] }))
            .filter((b) => b.cols?.length);
          if (!validBranches.length) {
            setLensAttributes(null);
            setError('Could not get columns for fork branches');
            setIsLoading(false);
            return;
          }

          const firstBranch = validBranches[0];
          const context = {
            dataViewSpec,
            fieldName: '',
            textBasedColumns: firstBranch.cols,
            query: { esql: firstBranch.branch.sourceQuery },
          };
          const suggestions = stateHelper.suggestions(
            context,
            fetchParams.dataView,
            [],
            ChartType.XY,
            undefined
          );
          if (cancelled) return;
          if (!suggestions?.length) {
            setLensAttributes(null);
            setError('No XY chart suggestion for fork source data');
            setIsLoading(false);
            return;
          }

          const firstSuggestion = suggestions[0];

          const datasourceLayers: Record<
            string,
            { index: string; query: { esql: string }; columns: unknown[]; timeField?: string }
          > = {};
          const visDataLayers: DataLayerLike[] = [];
          const forkLineColors = [
            euiTheme.colors.borderBaseProminent,
            euiTheme.colors.primary,
            euiTheme.colors.accent,
            euiTheme.colors.success,
            euiTheme.colors.warning,
          ];

          validBranches.forEach(({ branch, cols: branchCols }) => {
            const layerId = `fork-branch-${branch.branchIndex}`;
            const timeCol = branchCols.find(
              (c) =>
                c.meta?.type === 'date' ||
                (typeof c.meta?.type === 'string' && c.meta.type.startsWith('date'))
            );
            const valueCol =
              branchCols.find((c) => c.id !== timeCol?.id && c.meta?.type === 'number') ??
              branchCols.find((c) => c.id !== timeCol?.id);
            if (!timeCol || !valueCol) return;

            const entityLabel = branch.branchLabel;
            const valueColumnId = `${layerId}-${valueCol.id}`;
            const textBasedColumns = branchCols.map((c) => {
              const isValueCol = c.id === valueCol.id;
              return {
                columnId: isValueCol ? valueColumnId : c.id,
                fieldName: c.id,
                label: isValueCol ? entityLabel : c.name,
                meta: c.meta,
                ...(isValueCol ? { customLabel: true } : {}),
              };
            });
            datasourceLayers[layerId] = {
              index: fetchParams.dataView.id ?? dataViewSpec.id ?? '',
              query: { esql: branch.sourceQuery },
              columns: textBasedColumns,
              timeField: dataViewSpec.timeFieldName,
            };
            const color = forkLineColors[branch.branchIndex % forkLineColors.length];
            visDataLayers.push({
              layerId,
              layerType: 'data',
              seriesType: 'line',
              xAccessor: timeCol.id,
              accessors: [valueColumnId],
              yConfig: [{ forAccessor: valueColumnId, color }],
            });
          });

          const forkSuggestion = {
            ...firstSuggestion,
            datasourceState: {
              ...(firstSuggestion.datasourceState ?? {}),
              layers: datasourceLayers,
              indexPatternRefs: [
                {
                  id: fetchParams.dataView.id ?? dataViewSpec.id ?? '',
                  title: dataViewSpec.title ?? '',
                  timeField: dataViewSpec.timeFieldName,
                },
              ],
            },
            visualizationState: {
              ...(firstSuggestion.visualizationState ?? {}),
              layers: visDataLayers,
              preferredSeriesType: 'line',
            },
          };
          attributes = getLensAttributesFromSuggestion({
            filters: fetchParams.filters ?? [],
            query: fetchParams.query as { esql: string },
            suggestion: forkSuggestion,
            dataView: fetchParams.dataView,
          }) as TypedLensByValueInput['attributes'];
        } else {
          if (!sourceQuery) {
            setLensAttributes(null);
            setIsLoading(false);
            return;
          }
          const singleSourceQuery = sourceQuery;
          const context = {
            dataViewSpec,
            fieldName: '',
            textBasedColumns: sourceColumns,
            query: { esql: singleSourceQuery },
          };

          const suggestions = stateHelper.suggestions(
            context,
            fetchParams.dataView,
            [],
            ChartType.XY,
            undefined
          );

          if (cancelled) return;
          if (!suggestions?.length) {
            setLensAttributes(null);
            setError('No XY chart suggestion for source data');
            setIsLoading(false);
            return;
          }

          attributes = getLensAttributesFromSuggestion({
            filters: fetchParams.filters ?? [],
            query: { esql: singleSourceQuery },
            suggestion: suggestions[0],
            dataView: fetchParams.dataView,
          }) as TypedLensByValueInput['attributes'];

          const visStateForLine = attributes?.state?.visualization as
            | { layers?: DataLayerLike[]; preferredSeriesType?: string }
            | undefined;
          if (visStateForLine?.layers?.length) {
            const lineLayers = applyLineChartStyleToDataLayers(
              visStateForLine.layers,
              euiTheme.colors.borderBaseProminent
            );
            attributes = {
              ...attributes,
              state: {
                ...attributes.state,
                visualization: {
                  ...visStateForLine,
                  preferredSeriesType: 'line',
                  layers: lineLayers,
                },
              } as TypedLensByValueInput['attributes']['state'],
            };
          }
        }

        const table = fetchParams.table;
        const timeColumnId = changePointColumnNames ? getTimeColumnId(columns) : undefined;
        const typeColumnId = changePointColumnNames?.typeColumn;
        const pvalueColumnId = changePointColumnNames?.pvalueColumn;
        const valueColumnId = timeColumnId
          ? getValueColumnId(columns, timeColumnId, typeColumnId, pvalueColumnId)
          : undefined;
        const forkColumnId = isForkMode ? FORK_COLUMN_ID : undefined;

        const visState = attributes?.state?.visualization as
          | { layers?: Array<{ layerId: string }> }
          | undefined;
        if (table?.rows?.length && timeColumnId && valueColumnId && visState?.layers) {
          const results = getChangePointResultsFromTable(
            table,
            timeColumnId,
            typeColumnId,
            pvalueColumnId,
            valueColumnId,
            forkColumnId,
            forkBranches
          );
          // Add change point annotations over the line chart (like AIOps)
          if (results.length > 0) {
            const forkLineColors = [
              euiTheme.colors.borderBaseProminent,
              euiTheme.colors.primary,
              euiTheme.colors.accent,
              euiTheme.colors.success,
              euiTheme.colors.warning,
            ];

            let annotationLayers: DataLayerLike[] = [];

            const hasForkIndex = results.some((r) => r.forkIndex !== undefined);
            if (isForkMode && forkBranches && hasForkIndex) {
              forkBranches.forEach((branch, branchIdx) => {
                const branchResults = results.filter(
                  (r) => r.forkIndex === branch.branchIndex || r.forkIndex === branchIdx
                );
                if (branchResults.length === 0) return;
                const color = forkLineColors[branchIdx % forkLineColors.length];
                const annotations = branchResults.map((r, idx) => ({
                  id: `change-point-annotation-b${branchIdx}-${idx}`,
                  type: 'manual' as const,
                  icon: 'triangle' as const,
                  textVisibility: true,
                  label: formatChangePointAnnotationLabel(
                    r.type,
                    r.pvalue ?? null,
                    branch.branchLabel
                  ),
                  key: { type: 'point_in_time' as const, timestamp: r.timestamp },
                  isHidden: false,
                  color,
                  lineStyle: 'solid' as const,
                  lineWidth: 1,
                  outside: false,
                }));
                annotationLayers.push({
                  layerId: `${CHANGE_POINT_TOOLTIP_ANNOTATION_LAYER_ID}-branch-${branchIdx}`,
                  layerType: 'annotations' as const,
                  indexPatternId: fetchParams.dataView.id ?? '',
                  annotations,
                  ignoreGlobalFilters: true,
                } as DataLayerLike);
              });
            } else {
              const entityName =
                table.columns.find((c) => c.id === valueColumnId || c.name === valueColumnId)
                  ?.name ?? valueColumnId;
              const annotations = results.map((r, idx) => ({
                id: `change-point-annotation-${idx}`,
                type: 'manual' as const,
                icon: 'triangle' as const,
                textVisibility: true,
                label: formatChangePointAnnotationLabel(r.type, r.pvalue ?? null, entityName),
                key: { type: 'point_in_time' as const, timestamp: r.timestamp },
                isHidden: false,
                color: euiTheme.colors.danger,
                lineStyle: 'solid' as const,
                lineWidth: 1,
                outside: false,
              }));
              annotationLayers = [
                {
                  layerId: CHANGE_POINT_TOOLTIP_ANNOTATION_LAYER_ID,
                  layerType: 'annotations' as const,
                  indexPatternId: fetchParams.dataView.id ?? '',
                  annotations,
                  ignoreGlobalFilters: true,
                } as DataLayerLike,
              ];
            }

            if (annotationLayers.length > 0) {
              const visWithLayers = attributes.state?.visualization as {
                layers?: DataLayerLike[];
                [key: string]: unknown;
              };
              const newLayers = [...(visWithLayers?.layers ?? []), ...annotationLayers];

              attributes = {
                ...attributes,
                state: {
                  ...attributes.state,
                  visualization: {
                    ...visWithLayers,
                    layers: newLayers,
                  },
                } as TypedLensByValueInput['attributes']['state'],
              };
            }
          }
        }

        setLensAttributes(attributes);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Failed to load chart');
          setLensAttributes(null);
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    loadXYAttributes();
    return () => {
      cancelled = true;
    };
  }, [
    fetchParams.query,
    fetchParams.dataView,
    fetchParams.isESQLQuery,
    fetchParams.filters,
    fetchParams.table,
    fetchParams.timeRange,
    fetchParams.abortController,
    sourceQuery,
    sourceColumns,
    forkBranchQueries,
    columns,
    changePointColumnNames,
    lens,
    data.search,
    data.query.timefilter.timefilter,
    euiTheme,
  ]);

  const handleBrushEnd = useCallback(
    (event: Parameters<NonNullable<typeof onBrushEnd>>[0]) => {
      event.preventDefault();
      if (onBrushEnd) {
        onBrushEnd(event);
      } else if (event.range?.length >= 2) {
        const [min, max] = event.range;
        data.query.timefilter.timefilter.setTime({
          from: new Date(min).toISOString(),
          to: new Date(max).toISOString(),
          mode: 'absolute',
        });
      }
    },
    [onBrushEnd, data.query.timefilter.timefilter]
  );

  if (!isComponentVisible) {
    return null;
  }

  const chartCss = css({
    flex: 1,
    marginBlock: euiTheme.size.xs,
    minHeight: 350,
    position: 'relative',
    '& > div': {
      height: '100%',
      position: 'absolute',
      width: '100%',
    },
  });

  const showHeatmap =
    lensAttributes && !error && !isLoading && multipleEntityMode && viewMode === 'heatmap';
  const showLineChart =
    lensAttributes &&
    !error &&
    !isLoading &&
    (!multipleEntityMode || (forkBranchQueries?.length === 1 && viewMode === 'line'));
  const showMultipleLineCharts =
    lensAttributes &&
    !error &&
    !isLoading &&
    multipleEntityMode &&
    viewMode === 'multiple-line' &&
    forkBranchQueries &&
    forkBranchQueries.length > 0;

  const showBurstDetectionHistogram =
    !error &&
    !isLoading &&
    multipleEntityMode &&
    viewMode === 'burst-detection' &&
    forkBranchQueries &&
    forkBranchQueries.length > 0 &&
    burstDetectionHistogramData.length > 0;

  const renderChartContent = () => {
    if (showHeatmap) {
      return (
        <ChangePointForkHeatmap
          results={heatmapResults}
          forkBranches={forkBranchQueries ?? []}
          selectedEntityIndices={selectedEntityIndices}
          onSelectEntity={setSelectedEntityIndices}
          timeRange={fetchParams.timeRange}
          charts={charts}
          renderEntityDetailChart={(entityIndex) => {
            const attrs = entityAttributesMap[entityIndex];
            if (!attrs) return null;
            return (
              <div
                css={css({
                  minHeight: 200,
                  height: '100%',
                  position: 'relative',
                  '& > div': { height: '100%', position: 'absolute', width: '100%' },
                })}
                data-test-subj="changePointEntityDetailChart"
              >
                <lens.EmbeddableComponent
                  abortController={fetchParams.abortController}
                  attributes={attrs}
                  executionContext={{ description: 'Discover change point entity detail' }}
                  id={`discover-change-point-entity-${entityIndex}`}
                  lastReloadRequestTime={fetchParams.lastReloadRequestTime}
                  noPadding={true}
                  onBrushEnd={handleBrushEnd}
                  onFilter={onFilter}
                  searchSessionId={fetchParams.searchSessionId}
                  syncCursor={true}
                  syncTooltips={true}
                  timeRange={fetchParams.timeRange}
                  viewMode="view"
                />
              </div>
            );
          }}
        />
      );
    }
    if (showLineChart) {
      return (
        <EuiFlexGroup direction="column" gutterSize="none" css={css({ flex: 1, minHeight: 0 })}>
          <EuiFlexItem grow css={css({ minHeight: 0 })}>
            <div css={chartCss} data-test-subj="changePointExperienceLensLineChart">
              <lens.EmbeddableComponent
                abortController={fetchParams.abortController}
                attributes={lensAttributes}
                executionContext={{ description: 'Discover change point chart' }}
                id="discover-change-point-lens"
                lastReloadRequestTime={fetchParams.lastReloadRequestTime}
                noPadding={true}
                onBrushEnd={handleBrushEnd}
                onFilter={onFilter}
                searchSessionId={fetchParams.searchSessionId}
                timeRange={fetchParams.timeRange}
                viewMode="view"
              />
            </div>
          </EuiFlexItem>
        </EuiFlexGroup>
      );
    }
    if (showMultipleLineCharts) {
      return (
        <>
          <EuiSpacer size="xs" />
          <EuiFlexGrid columns={3} css={css({ flex: 1, minHeight: 0 })}>
            {forkBranchQueries!.map((branch, entityIdx) => {
              const attrs = entityAttributesMap[entityIdx];
              if (!attrs) return null;
              const entityLabel = branch.branchLabel;
              return (
                <EuiFlexItem
                  key={entityLabel}
                  css={css({
                    minHeight: 220,
                    minWidth: 0,
                  })}
                >
                  <EuiPanel
                    paddingSize="xs"
                    hasBorder
                    hasShadow={false}
                    css={css({
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      overflow: 'hidden',
                    })}
                    data-test-subj={`changePointMultipleLineChart-${entityLabel}`}
                  >
                    <EuiFlexGroup
                      direction="column"
                      gutterSize="xs"
                      css={css({ flex: 1, minHeight: 0 })}
                    >
                      <EuiFlexItem grow={false}>
                        <EuiText
                          size="xs"
                          css={css({
                            fontWeight: 600,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          })}
                          title={entityLabel}
                        >
                          {entityLabel}
                        </EuiText>
                      </EuiFlexItem>
                      <EuiFlexItem
                        grow
                        css={css({
                          minHeight: 0,
                          overflow: 'hidden',
                        })}
                      >
                        <div
                          css={css({
                            minHeight: 200,
                            height: '100%',
                            position: 'relative',
                            '& > div': {
                              height: '100%',
                              position: 'absolute',
                              width: '100%',
                            },
                          })}
                        >
                          <lens.EmbeddableComponent
                            abortController={fetchParams.abortController}
                            attributes={attrs}
                            executionContext={{ description: 'Discover change point entity chart' }}
                            id={`discover-change-point-multiple-entity-${entityLabel}`}
                            lastReloadRequestTime={fetchParams.lastReloadRequestTime}
                            noPadding={true}
                            onBrushEnd={handleBrushEnd}
                            onFilter={onFilter}
                            searchSessionId={fetchParams.searchSessionId}
                            syncCursor={true}
                            syncTooltips={true}
                            timeRange={fetchParams.timeRange}
                            viewMode="view"
                          />
                        </div>
                      </EuiFlexItem>
                    </EuiFlexGroup>
                  </EuiPanel>
                </EuiFlexItem>
              );
            })}
          </EuiFlexGrid>
        </>
      );
    }
    if (showBurstDetectionHistogram) {
      return (
        <EuiFlexGroup direction="column" gutterSize="none" css={css({ flex: 1, minHeight: 0 })}>
          <EuiFlexItem grow css={css({ minHeight: 0 })}>
            <div css={chartCss} data-test-subj="changePointBurstHistogramContainer">
              <ChangePointBurstHistogram data={burstDetectionHistogramData} charts={charts} />
            </div>
          </EuiFlexItem>
        </EuiFlexGroup>
      );
    }
    return (
      <EuiFlexGroup
        alignItems="center"
        css={css({ minHeight: 350, height: '100%' })}
        justifyContent="center"
      >
        <EuiFlexItem grow={false}>
          <EuiText color="subdued" size="s">
            <FormattedMessage
              id="discover.contextAwareness.changePointExperience.chartNotAvailableMessage"
              defaultMessage="Chart not available for this query"
            />
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  };

  return (
    <div
      css={[
        histogramCss,
        css({
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          minHeight: 0,
          paddingLeft: euiTheme.size.m,
          paddingRight: euiTheme.size.m,
        }),
      ]}
      data-test-subj="changePointExperienceView"
    >
      {chartToolbarCss ? (
        <div css={chartToolbarCss} className="eui-xScroll">
          <EuiFlexGroup alignItems="center" gutterSize="s" wrap>
            <EuiFlexItem grow={false}>{renderToggleActions?.()}</EuiFlexItem>
            {multipleEntityMode && (
              <EuiFlexItem grow={false}>
                <EuiSelect
                  compressed
                  value={viewMode}
                  onChange={(e) =>
                    setViewMode(
                      e.target.value as 'heatmap' | 'line' | 'multiple-line' | 'burst-detection'
                    )
                  }
                  aria-label={i18n.translate(
                    'discover.contextAwareness.changePointExperience.viewModeLabel',
                    { defaultMessage: 'Chart view mode' }
                  )}
                  options={[
                    {
                      value: 'heatmap',
                      text: i18n.translate(
                        'discover.contextAwareness.changePointExperience.viewHeatmap',
                        { defaultMessage: 'Heatmap' }
                      ),
                    },
                    ...(forkBranchQueries && forkBranchQueries.length === 1
                      ? [
                          {
                            value: 'line' as const,
                            text: i18n.translate(
                              'discover.contextAwareness.changePointExperience.viewLineChart',
                              { defaultMessage: 'Line chart' }
                            ),
                          },
                        ]
                      : []),
                    {
                      value: 'multiple-line',
                      text: i18n.translate(
                        'discover.contextAwareness.changePointExperience.viewMultipleLineCharts',
                        { defaultMessage: 'Multiple line charts' }
                      ),
                    },
                    {
                      value: 'burst-detection',
                      text: i18n.translate(
                        'discover.contextAwareness.changePointExperience.viewBurstDetection',
                        { defaultMessage: 'Burst Detection Histogram' }
                      ),
                    },
                  ]}
                  data-test-subj="changePointViewModeSelect"
                />
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        </div>
      ) : null}
      <EuiFlexGroup direction="column" gutterSize="none" css={css({ flex: 1, minHeight: 0 })}>
        <EuiFlexItem grow css={css({ minHeight: 0, overflowY: 'auto' })}>
          {isLoading ? (
            <EuiFlexGroup
              alignItems="center"
              css={css({ minHeight: 350, height: '100%' })}
              justifyContent="center"
            >
              <EuiFlexItem grow={false}>
                <EuiLoadingChart size="l" />
              </EuiFlexItem>
            </EuiFlexGroup>
          ) : null}
          {error ? (
            <EuiFlexGroup
              alignItems="center"
              css={css({ minHeight: 350, height: '100%' })}
              justifyContent="center"
            >
              <EuiFlexItem grow={false}>
                <EuiText color="subdued" size="s">
                  {error}
                </EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
          ) : null}
          {renderChartContent()}
        </EuiFlexItem>
      </EuiFlexGroup>
    </div>
  );
};
