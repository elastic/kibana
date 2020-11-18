/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import React, {
  BaseSyntheticEvent,
  KeyboardEvent,
  memo,
  useCallback,
  useMemo,
  useState,
} from 'react';
import { uniq } from 'lodash';

import {
  Chart,
  Datum,
  LayerValue,
  Partition,
  PartitionConfig,
  PartitionLayer,
  PartitionLayout,
  PartitionFillLabel,
  RecursivePartial,
  Position,
  Settings,
  RenderChangeListener,
  TooltipProps,
  TooltipType,
} from '@elastic/charts';
import { keys } from '@elastic/eui';
import { SeriesLayer } from '../../charts/public';

// import {
//   getFilterFromChartClickEventFn,
//   getFilterFromSeriesFn,
//   LegendToggle,
//   getBrushFromChartBrushEventFn,
//   ClickTriggerEvent,
// } from '../../charts/public';
import { Datatable, DatatableColumn, IInterpreterRenderHandlers } from '../../expressions/public';
import { ValueClickContext } from '../../embeddable/public';

import { PieVisParams, BucketColumns, LabelPositions, ValueFormats } from './types';
import { getThemeService, getColorsService, getFormatService } from './services';
import { getTooltip } from './components';
// import { colorSchemas } from 'src/plugins/charts/public';
// import { ChartType } from '../common';

import './chart.scss';

export interface PieComponentProps {
  visParams: PieVisParams;
  visData: Datatable;
  uiState: IInterpreterRenderHandlers['uiState'];
  visFormattedData: any;
  fireEvent: IInterpreterRenderHandlers['event'];
  renderComplete: IInterpreterRenderHandlers['done'];
}

export type PieComponentType = typeof PieComponent;

const EMPTY_SLICE = Symbol('empty_slice');

const PieComponent = (props: PieComponentProps) => {
  /**
   * Stores all series labels to replicate vislib color map lookup
   */
  // const allSeries: Array<string | number> = [];
  const chartTheme = getThemeService().useChartsTheme();
  const chartBaseTheme = getThemeService().useChartsBaseTheme();
  const defaultPalette = getColorsService().getAll()[0];

  // const [showLegend, setShowLegend] = useState<boolean>(() => {
  //   // TODO: Check when this bwc can safely be removed
  //   const bwcLegendStateDefault =
  //     props.visParams.addLegend == null ? true : props.visParams.addLegend;
  //   return props.uiState?.get('vis.legendOpen', bwcLegendStateDefault) as boolean;
  // });

  const [showLegend, setShowLegend] = useState(true);

  const onRenderChange = useCallback<RenderChangeListener>(
    (isRendered) => {
      if (isRendered) {
        props.renderComplete();
      }
    },
    [props]
  );

  // move it to utils
  const handleFilterClick = useCallback(
    (clickedLayers: LayerValue[], bucketColumns: BucketColumns[], visData: Datatable): void => {
      const data: ValueClickContext['data']['data'] = [];
      const matchingIndex = visData.rows.findIndex((row) =>
        clickedLayers.every((layer, index) => {
          const columnId = bucketColumns[index].id;
          return row[columnId] === layer.groupByRollup;
        })
      );

      data.push(
        ...clickedLayers.map((clickedLayer, index) => ({
          column: visData.columns.findIndex((col) => col.id === bucketColumns[index].id),
          row: matchingIndex,
          value: clickedLayer.groupByRollup,
          table: visData,
        }))
      );

      const event = {
        name: 'filterBucket',
        data: { data },
      };

      props.fireEvent(event);
    },
    [props]
  );

  // const getFilterEventData = useCallback(
  //   (visData: Datatable, xAccessor: string | number | null) => (
  //     series: XYChartSeriesIdentifier
  //   ): ClickTriggerEvent | null => {
  //     if (xAccessor !== null) {
  //       return getFilterFromSeriesFn(visData)(series);
  //     }

  //     return null;
  //   },
  //   []
  // );

  // const handleFilterAction = useCallback(
  //   (event: ClickTriggerEvent, negate = false) => {
  //     props.fireEvent({
  //       ...event,
  //       data: {
  //         ...event.data,
  //         negate,
  //       },
  //     });
  //   },
  //   [props]
  // );

  // const canFilter = async (event: ClickTriggerEvent | null): Promise<boolean> => {
  //   if (!event) {
  //     return false;
  //   }
  //   const filters = await getDataActions().createFiltersFromValueClickAction(event.data);
  //   return Boolean(filters.length);
  // };

  const toggleLegend = useCallback(() => {
    setShowLegend((value) => {
      const newValue = !value;
      props.uiState?.set('vis.legendOpen', newValue);
      return newValue;
    });
  }, [props.uiState?.set]);

  const setColor = useCallback(
    (newColor: string | null, seriesLabel: string | number, event: BaseSyntheticEvent) => {
      if ((event as KeyboardEvent).key && (event as KeyboardEvent).key !== keys.ENTER) {
        return;
      }

      const colors = props.uiState?.get('vis.colors') || {};
      if (colors[seriesLabel] === newColor || !newColor) {
        delete colors[seriesLabel];
      } else {
        colors[seriesLabel] = newColor;
      }
      props.uiState?.setSilent('vis.colors', null);
      props.uiState?.set('vis.colors', colors);
      props.uiState?.emit('colorChanged');
    },
    [props.uiState?.emit, props.uiState?.get, props.uiState?.set, props.uiState?.setSilent]
  );

  const { visData, visParams, visFormattedData } = props;

  // const config = getConfig(visData, visParams);
  // const legendPosition = useMemo(() => config.legend.position ?? Position.Right, [
  //   config.legend.position,
  // ]);
  // const timeZone = getTimeZone();
  // const xDomain =
  //   config.xAxis.scale.type === ScaleType.Ordinal ? undefined : getXDomain(config.aspects.x.params);
  // const hasBars = visParams.seriesParams.some(
  //   ({ type, data: { id: paramId } }) =>
  //     type === ChartType.Histogram && config.aspects.y.find(({ aggId }) => aggId === paramId)
  // );
  // const adjustedXDomain =
  //   config.xAxis.scale.type === ScaleType.Ordinal
  //     ? undefined
  //     : getAdjustedDomain(visData.rows, config.aspects.x, timeZone, xDomain, hasBars);
  // const legendPosition = useMemo(() => config.legend.position ?? Position.Right, [
  //   config.legend.position,
  // ]);
  // const isDarkMode = getThemeService().useDarkMode();
  // const getSeriesName = getSeriesNameFn(config.aspects, config.aspects.y.length > 1);

  // const getSeriesColor = useCallback(
  //   (series: XYChartSeriesIdentifier) => {
  //     const seriesName = getSeriesName(series);
  //     if (!seriesName) {
  //       return;
  //     }

  //     const overwriteColors: Record<string, string> = props.uiState?.get('vis.colors', {});

  //     allSeries.push(seriesName);
  //     return getColorsService().createColorLookupFunction(allSeries, overwriteColors)(seriesName);
  //   },
  //   [allSeries, getSeriesName, props.uiState?.get]
  // );

  function getSliceValue(d: Datum, metricColumn: DatatableColumn) {
    if (typeof d[metricColumn.id] === 'number' && d[metricColumn.id] !== 0) {
      return d[metricColumn.id];
    }
    return Number.EPSILON;
  }

  const fillLabel: Partial<PartitionFillLabel> = {
    textInvertible: true,
    valueFont: {
      fontWeight: 700,
    },
  };

  if (!visParams.labels.values) {
    fillLabel.valueFormatter = () => '';
  }

  const config: RecursivePartial<PartitionConfig> = {
    partitionLayout: PartitionLayout.sunburst,
    fontFamily: chartTheme.barSeriesStyle?.displayValue?.fontFamily,
    outerSizeRatio: 1,
    specialFirstInnermostSector: true,
    clockwiseSectors: false,
    minFontSize: 10,
    maxFontSize: 16,
    linkLabel: {
      maxCount: Number.POSITIVE_INFINITY,
      fontSize: 11,
      textColor: chartTheme.axes?.axisTitle?.fill,
      maxTextLength: visParams.labels.truncate ?? undefined,
    },
    sectorLineStroke: chartTheme.lineSeriesStyle?.point?.fill,
    sectorLineWidth: 1.5,
    circlePadding: 4,
    emptySizeRatio: visParams.isDonut ? 0.3 : 0,
  };
  if (!visParams.labels.show) {
    // Force all labels to be linked, then prevent links from showing
    config.linkLabel = { maxCount: 0, maximumSection: Number.POSITIVE_INFINITY };
  }
  if (visParams.labels.position === LabelPositions.INSIDE) {
    config.linkLabel = { maxCount: 0 };
  }
  const metricFieldFormatter = getFormatService().deserialize(visParams.dimensions.metric.format);
  const percentFormatter = getFormatService().deserialize({
    id: 'percent',
    params: {
      pattern: '0.[00]%',
    },
  });

  const bucketColumns: BucketColumns[] = [];
  if (visParams.dimensions.buckets) {
    visParams.dimensions.buckets.forEach((b) => {
      bucketColumns.push({ ...visData.columns[b.accessor], format: b.format });
    });
  } else {
    bucketColumns.push(visData.columns[0]);
  }
  // calclulate metric column --> move to utils
  const lastBucketId = bucketColumns[bucketColumns.length - 1].id;
  const matchingIndex = visData.columns.findIndex((col) => col.id === lastBucketId);
  const metricColumn = visData.columns[matchingIndex + 1];

  const totalSeriesCount = uniq(
    visData.rows.map((row) => {
      return bucketColumns.map(({ id: columnId }) => row[columnId]).join(',');
    })
  ).length;

  const layers: PartitionLayer[] = bucketColumns.map((col) => {
    return {
      groupByRollup: (d: Datum) => d[col.id] ?? EMPTY_SLICE,
      showAccessor: (d: Datum) => d !== EMPTY_SLICE,
      nodeLabel: (d: unknown) => {
        if (col.meta.params) {
          return getFormatService().deserialize(col.format).convert(d) ?? '';
        }
        return String(d);
      },
      fillLabel,
      shape: {
        fillColor: (d) => {
          const seriesLayers: SeriesLayer[] = [];

          // Color is determined by round-robin on the index of the innermost slice
          // This has to be done recursively until we get to the slice index
          let tempParent: typeof d | typeof d['parent'] = d;
          while (tempParent.parent && tempParent.depth > 0) {
            seriesLayers.unshift({
              name: String(tempParent.parent.children[tempParent.sortIndex][0]),
              rankAtDepth: tempParent.sortIndex,
              totalSeriesAtDepth: tempParent.parent.children.length,
            });
            tempParent = tempParent.parent;
          }

          const outputColor = defaultPalette.getColor(seriesLayers, {
            behindText: visParams.labels.show,
            maxDepth: visData.columns.length,
            totalSeries: totalSeriesCount,
          });

          return outputColor || 'rgba(0,0,0,0)';
        },
      },
    };
  });

  const tooltip: TooltipProps = {
    type: visParams.addTooltip ? TooltipType.Follow : TooltipType.None,
    // customTooltip: getTooltip(
    //   visData,
    //   metricFieldFormatter,
    //   bucketColumns,
    //   metricColumn
    // ),
  };

  return (
    <div className="pieChart__container" data-test-subj="visTypePieChart">
      <div className="pieChart__wrapper">
        {/* <LegendToggle
        onClick={toggleLegend}
        showLegend={showLegend}
        legendPosition={legendPosition}
      /> */}
        <Chart size="100%">
          <Settings
            showLegend={showLegend}
            legendPosition={visParams.legendPosition || Position.Right}
            legendMaxDepth={visParams.nestedLegend ? undefined : 1}
            tooltip={tooltip}
            onElementClick={(args) => {
              handleFilterClick(args[0][0] as LayerValue[], bucketColumns, visData);
            }}
            theme={chartTheme}
            baseTheme={chartBaseTheme}
          />
          <Partition
            id="pie"
            data={visData.rows}
            valueAccessor={(d: Datum) => getSliceValue(d, metricColumn)}
            percentFormatter={(d: number) => percentFormatter.convert(d / 100)}
            valueGetter={
              !visParams.labels.show || visParams.labels.valuesFormat === ValueFormats.VALUE
                ? undefined
                : 'percent'
            }
            valueFormatter={(d: number) =>
              !visParams.labels.show ? '' : metricFieldFormatter.convert(d)
            }
            layers={layers}
            config={config}
            topGroove={!visParams.labels.show ? 0 : undefined}
          />
        </Chart>
      </div>
    </div>
  );
};

// eslint-disable-next-line import/no-default-export
export default memo(PieComponent);
