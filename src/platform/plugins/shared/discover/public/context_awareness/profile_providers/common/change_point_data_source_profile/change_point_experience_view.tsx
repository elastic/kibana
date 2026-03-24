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
import { EuiFlexGroup, EuiFlexItem, EuiLoadingChart, EuiText, useEuiTheme } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { isOfAggregateQueryType } from '@kbn/es-query';
import type { TypedLensByValueInput } from '@kbn/lens-plugin/public';
import { ChartType, getLensAttributesFromSuggestion } from '@kbn/visualization-utils';
import {
  getSourceQueryBeforeChangePoint,
  getForkBranchLabels,
  getTemplateSourceQueryFromForkWithChangePoint,
  getESQLQueryColumns,
  replaceEntityValueInSourceQuery,
} from '@kbn/esql-utils';
import { useDiscoverServices } from '../../../../hooks/use_discover_services';
import { ChangePointBurstHistogram } from './change_point_burst_histogram';
import { ChangePointHeatmap } from './change_point_heatmap';
import {
  ChangePointLensEmbeddable,
  changePointLensNestedChartWrapperCss,
} from './change_point_lens_embeddable';
import { ChangePointMultipleLineCharts } from './change_point_multiple_line_charts';
import { ViewModeSelection, type ChangePointViewMode } from './view_mode_selection';
import {
  applyLineChartStyleToDataLayers,
  buildChangePointLensAttributesByRecordId,
  deriveEntityAttributes,
  formatChangePointAnnotationLabel,
  getBurstDetectionHistogram,
  getChangePointColumnIdsFromColumns,
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
  changePointLensContext$,
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

  const colsToUse = useMemo(
    () => (fetchParams.table?.columns?.length ? fetchParams.table.columns : columns),
    [fetchParams.table?.columns, columns]
  );

  const changePointColumnIds = useMemo(
    () => getChangePointColumnIdsFromColumns(colsToUse),
    [colsToUse]
  );

  const sourceQuery = useMemo(() => {
    const query = fetchParams.query as { esql?: string } | undefined;
    return query?.esql ? getSourceQueryBeforeChangePoint(query.esql) : undefined;
  }, [fetchParams.query]);

  const forkBranchLabels = useMemo(() => {
    const query = fetchParams.query as { esql?: string } | undefined;
    return query?.esql ? getForkBranchLabels(query.esql) : undefined;
  }, [fetchParams.query]);

  const templateSourceQuery = useMemo(() => {
    const query = fetchParams.query as { esql?: string } | undefined;
    return query?.esql ? getTemplateSourceQueryFromForkWithChangePoint(query.esql) : undefined;
  }, [fetchParams.query]);

  const multipleEntityMode = Boolean(forkBranchLabels?.length);

  const [viewMode, setViewMode] = useState<ChangePointViewMode>('multiple-line');
  const [selectedEntityIndices, setSelectedEntityIndices] = useState<number[]>([]);

  useEffect(() => {
    if (forkBranchLabels && selectedEntityIndices.length > 0) {
      const valid = selectedEntityIndices.filter((i) => i < forkBranchLabels.length);
      if (valid.length !== selectedEntityIndices.length) {
        setSelectedEntityIndices(valid);
      }
    }
  }, [selectedEntityIndices, forkBranchLabels]);

  const sourceColumns = useMemo(() => {
    const { typeColumnId, pvalueColumnId } = changePointColumnIds;
    if (!typeColumnId && !pvalueColumnId) return columns;
    return columns.filter((c) => {
      const id = c.id ?? c.name;
      return id !== typeColumnId && id !== pvalueColumnId;
    });
  }, [columns, changePointColumnIds]);

  const heatmapResults = useMemo((): ChangePointResult[] => {
    const table = fetchParams.table;
    if (!table?.rows?.length || !multipleEntityMode || !forkBranchLabels?.length) return [];
    const timeColumnId = getTimeColumnId(colsToUse);
    const { typeColumnId, pvalueColumnId } = changePointColumnIds;
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
      forkBranchLabels
    );
  }, [fetchParams.table, multipleEntityMode, forkBranchLabels, colsToUse, changePointColumnIds]);

  const entityLabels = useMemo(
    () => forkBranchLabels?.map((b) => b.branchLabel) ?? [],
    [forkBranchLabels]
  );

  const burstDetectionHistogramData = useMemo(() => {
    if (!multipleEntityMode || !forkBranchLabels?.length || heatmapResults.length === 0) return [];
    return getBurstDetectionHistogram(heatmapResults, entityLabels, fetchParams.timeRange);
  }, [heatmapResults, forkBranchLabels, multipleEntityMode, entityLabels, fetchParams.timeRange]);

  const entityAttributesMap = useMemo(() => {
    if (!lensAttributes || !multipleEntityMode || !forkBranchLabels) return {};
    const dataViewId = fetchParams.dataView?.id ?? '';
    const forkLineColors = [
      euiTheme.colors.borderBaseProminent,
      euiTheme.colors.primary,
      euiTheme.colors.accent,
      euiTheme.colors.success,
      euiTheme.colors.warning,
    ];
    const map: Record<number, TypedLensByValueInput['attributes']> = {};
    for (let i = 0; i < forkBranchLabels.length; i++) {
      const entityResults = heatmapResults.filter(
        (r) => r.forkIndex === i || r.forkIndex === forkBranchLabels[i].branchIndex
      );
      const attrs = deriveEntityAttributes(
        lensAttributes,
        i,
        entityResults,
        forkBranchLabels[i].branchLabel,
        dataViewId,
        forkLineColors
      );
      if (attrs) map[i] = attrs;
    }
    return map;
  }, [
    lensAttributes,
    multipleEntityMode,
    forkBranchLabels,
    heatmapResults,
    fetchParams.dataView?.id,
    euiTheme.colors,
  ]);

  const changePointDocLensContextValue = useMemo(() => {
    const lensAttributesByRecordId = buildChangePointLensAttributesByRecordId(
      fetchParams.table,
      colsToUse,
      changePointColumnIds,
      forkBranchLabels,
      entityAttributesMap,
      lensAttributes,
      multipleEntityMode
    );
    return {
      lensAttributesByRecordId,
      fetchSlice: {
        abortController: fetchParams.abortController,
        lastReloadRequestTime: fetchParams.lastReloadRequestTime,
        searchSessionId: fetchParams.searchSessionId,
        timeRange: fetchParams.timeRange,
      },
    };
  }, [
    fetchParams.table,
    fetchParams.abortController,
    fetchParams.lastReloadRequestTime,
    fetchParams.searchSessionId,
    fetchParams.timeRange,
    colsToUse,
    changePointColumnIds,
    forkBranchLabels,
    entityAttributesMap,
    lensAttributes,
    multipleEntityMode,
  ]);

  useEffect(() => {
    if (!isComponentVisible) {
      changePointLensContext$.next(undefined);
      return undefined;
    }
    changePointLensContext$.next(changePointDocLensContextValue);
    return () => {
      changePointLensContext$.next(undefined);
    };
  }, [changePointLensContext$, isComponentVisible, changePointDocLensContextValue]);

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

      const isForkMode = Boolean(forkBranchLabels?.length);
      const effectiveSourceQuery = isForkMode ? templateSourceQuery : sourceQuery;

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

        if (isForkMode && forkBranchLabels) {
          const forkTable = fetchParams.table;
          const forkColsToUse = forkTable?.columns?.length ? forkTable.columns : columns;
          const forkTimeColumnId = getTimeColumnId(forkColsToUse);
          const forkChangePointIds = getChangePointColumnIdsFromColumns(forkColsToUse);
          const forkTypeColumnId = forkChangePointIds.typeColumnId;
          const forkPvalueColumnId = forkChangePointIds.pvalueColumnId;
          const forkValueColumnId = forkTimeColumnId
            ? getValueColumnId(
                forkColsToUse,
                forkTimeColumnId,
                forkTypeColumnId,
                forkPvalueColumnId
              )
            : undefined;

          const changePointResults =
            forkTable?.rows?.length && forkTimeColumnId && forkValueColumnId
              ? getChangePointResultsFromTable(
                  forkTable,
                  forkTimeColumnId,
                  forkTypeColumnId,
                  forkPvalueColumnId,
                  forkValueColumnId,
                  FORK_COLUMN_ID,
                  forkBranchLabels
                )
              : [];

          const uniqueForkIndices = [
            ...new Set(
              changePointResults.map((r) => r.forkIndex).filter((i): i is number => i !== undefined)
            ),
          ].sort((a, b) => a - b);

          const entitiesToShow =
            uniqueForkIndices.length > 0 && templateSourceQuery
              ? uniqueForkIndices.map((i) => ({
                  branchIndex: i,
                  branchLabel: forkBranchLabels[i].branchLabel,
                  sourceQuery: replaceEntityValueInSourceQuery(
                    templateSourceQuery,
                    forkBranchLabels[i].branchLabel
                  ),
                }))
              : forkBranchLabels.map((b) => ({
                  branchIndex: b.branchIndex,
                  branchLabel: b.branchLabel,
                  sourceQuery: replaceEntityValueInSourceQuery(
                    templateSourceQuery ?? '',
                    b.branchLabel
                  ),
                }));

          const templateColumns = await getESQLQueryColumns({
            esqlQuery: templateSourceQuery!,
            search: data.search.search,
            signal: fetchParams.abortController?.signal,
            timeRange: timeRange
              ? { from: timeRange.from, to: timeRange.to }
              : data.query.timefilter.timefilter.getAbsoluteTime(),
          });

          if (cancelled) return;

          const validEntities = templateColumns?.length
            ? entitiesToShow.map((entity) => ({ entity, cols: templateColumns }))
            : [];
          if (!validEntities.length) {
            setLensAttributes(null);
            setError('Could not get columns for fork branches');
            setIsLoading(false);
            return;
          }

          const firstEntity = validEntities[0];
          const context = {
            dataViewSpec,
            fieldName: '',
            textBasedColumns: firstEntity.cols,
            query: { esql: firstEntity.entity.sourceQuery },
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

          validEntities.forEach(({ entity, cols: branchCols }) => {
            const layerId = `fork-branch-${entity.branchIndex}`;
            const timeCol = branchCols.find(
              (c) =>
                c.meta?.type === 'date' ||
                (typeof c.meta?.type === 'string' && c.meta.type.startsWith('date'))
            );
            const valueCol =
              branchCols.find((c) => c.id !== timeCol?.id && c.meta?.type === 'number') ??
              branchCols.find((c) => c.id !== timeCol?.id);
            if (!timeCol || !valueCol) return;

            const entityLabel = entity.branchLabel;
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
              query: { esql: entity.sourceQuery },
              columns: textBasedColumns,
              timeField: dataViewSpec.timeFieldName,
            };
            const color = forkLineColors[entity.branchIndex % forkLineColors.length];
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
        const timeColumnId = getTimeColumnId(columns);
        const { typeColumnId, pvalueColumnId } = changePointColumnIds;
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
            forkBranchLabels
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
            if (isForkMode && forkBranchLabels && hasForkIndex) {
              forkBranchLabels.forEach((branch, branchIdx) => {
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
    forkBranchLabels,
    templateSourceQuery,
    columns,
    colsToUse,
    changePointColumnIds,
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
  const showLineCharts =
    lensAttributes &&
    !error &&
    !isLoading &&
    viewMode === 'multiple-line' &&
    ((!multipleEntityMode && lensAttributes) ||
      (multipleEntityMode && forkBranchLabels && forkBranchLabels.length > 0));

  const showBurstDetectionHistogram =
    !error &&
    !isLoading &&
    multipleEntityMode &&
    viewMode === 'burst-detection' &&
    forkBranchLabels &&
    forkBranchLabels.length > 0 &&
    burstDetectionHistogramData.length > 0;

  const renderChartContent = () => {
    if (showHeatmap) {
      return (
        <ChangePointHeatmap
          results={heatmapResults}
          forkBranches={forkBranchLabels ?? []}
          selectedEntityIndices={selectedEntityIndices}
          onSelectEntity={setSelectedEntityIndices}
          timeRange={fetchParams.timeRange}
          charts={charts}
          renderEntityDetailChart={(entityIndex) => {
            const attrs = entityAttributesMap[entityIndex];
            if (!attrs) return null;
            return (
              <ChangePointLensEmbeddable
                lens={lens}
                attributes={attrs}
                executionContextDescription="Discover change point entity detail"
                id={`discover-change-point-entity-${entityIndex}`}
                abortController={fetchParams.abortController}
                lastReloadRequestTime={fetchParams.lastReloadRequestTime}
                searchSessionId={fetchParams.searchSessionId}
                timeRange={fetchParams.timeRange}
                onBrushEnd={handleBrushEnd}
                onFilter={onFilter}
                syncCursor={true}
                syncTooltips={true}
                wrapperCss={changePointLensNestedChartWrapperCss()}
                dataTestSubj="changePointEntityDetailChart"
              />
            );
          }}
        />
      );
    }
    if (showLineCharts) {
      return (
        <ChangePointMultipleLineCharts
          lens={lens}
          multipleEntityMode={multipleEntityMode}
          forkBranchLabels={forkBranchLabels}
          entityAttributesMap={entityAttributesMap}
          lensAttributes={lensAttributes}
          fetchSlice={{
            abortController: fetchParams.abortController,
            lastReloadRequestTime: fetchParams.lastReloadRequestTime,
            searchSessionId: fetchParams.searchSessionId,
            timeRange: fetchParams.timeRange,
          }}
          onBrushEnd={handleBrushEnd}
          onFilter={onFilter}
        />
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
            {multipleEntityMode && <ViewModeSelection value={viewMode} onChange={setViewMode} />}
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
