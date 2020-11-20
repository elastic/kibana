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

import {
  Chart,
  Datum,
  LayerValue,
  Partition,
  PartitionConfig,
  PartitionLayout,
  PartitionFillLabel,
  RecursivePartial,
  Position,
  Settings,
  RenderChangeListener,
  TooltipProps,
  TooltipType,
  SeriesIdentifier,
} from '@elastic/charts';
import { keys } from '@elastic/eui';

// import {
//   getFilterFromChartClickEventFn,
//   getFilterFromSeriesFn,
//   LegendToggle,
//   ClickTriggerEvent,
// } from '../../charts/public';
import { Datatable, DatatableColumn, IInterpreterRenderHandlers } from '../../expressions/public';
import { ValueClickContext } from '../../embeddable/public';

import { PieVisParams, BucketColumns, LabelPositions, ValueFormats } from './types';
import { getThemeService, getFormatService, getDataActions } from './services';
import { getColorPicker, getLayers, getLegendActions, ClickTriggerEvent } from './utils';
import { LegendToggle } from './temp';

import './chart.scss';

export interface PieComponentProps {
  visParams: PieVisParams;
  visData: Datatable;
  uiState: IInterpreterRenderHandlers['uiState'];
  fireEvent: IInterpreterRenderHandlers['event'];
  renderComplete: IInterpreterRenderHandlers['done'];
}

export type PieComponentType = typeof PieComponent;

const PieComponent = (props: PieComponentProps) => {
  const chartTheme = getThemeService().useChartsTheme();
  const chartBaseTheme = getThemeService().useChartsBaseTheme();
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

  const getFilterEventData = useCallback(
    (visData: Datatable) => (series: SeriesIdentifier): ClickTriggerEvent | null => {
      // console.log(series.key);
      const data = visData.columns.reduce<ValueClickContext['data']['data']>(
        (acc, { id }, column) => {
          const value = series.key;
          const row = visData.rows.findIndex((r) => r[id] === value);
          if (row > -1) {
            acc.push({
              table: visData,
              column,
              row,
              value,
            });
          }

          return acc;
        },
        []
      );

      return {
        name: 'filterBucket',
        data: {
          negate: false,
          data,
        },
      };
    },
    []
  );

  const handleFilterAction = useCallback(
    (event: ClickTriggerEvent, negate = false) => {
      props.fireEvent({
        ...event,
        data: {
          ...event.data,
          negate,
        },
      });
    },
    [props]
  );

  const canFilter = async (event: ClickTriggerEvent | null): Promise<boolean> => {
    if (!event) {
      return false;
    }
    const filters = await getDataActions().createFiltersFromValueClickAction(event.data);
    return Boolean(filters.length);
  };

  const toggleLegend = useCallback(() => {
    setShowLegend((value) => {
      const newValue = !value;
      props.uiState?.set('vis.legendOpen', newValue);
      return newValue;
    });
  }, [props.uiState]);

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
      props.uiState?.emit('reload');
    },
    [props.uiState]
  );

  const { visData, visParams } = props;

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
      maxCount: 5,
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

  let layersColumns: Array<Partial<BucketColumns>> = [];
  const bucketColumns: BucketColumns[] = [];
  let metricColumn: DatatableColumn;
  if (visParams.dimensions.buckets) {
    visParams.dimensions.buckets.forEach((b) => {
      bucketColumns.push({ ...visData.columns[b.accessor], format: b.format });
      layersColumns = [...bucketColumns];
    });
    const lastBucketId = layersColumns[layersColumns.length - 1].id;
    const matchingIndex = visData.columns.findIndex((col) => col.id === lastBucketId);
    metricColumn = visData.columns[matchingIndex + 1];
  } else {
    metricColumn = visData.columns[0];
    layersColumns.push({
      name: metricColumn.name,
    });
  }

  const layers = getLayers(
    layersColumns,
    visParams,
    props.uiState?.get('vis.colors', {}),
    visData.rows.length
  );

  const tooltip: TooltipProps = {
    type: visParams.addTooltip ? TooltipType.Follow : TooltipType.None,
  };

  const legendPosition = useMemo(() => visParams.legendPosition ?? Position.Right, [
    visParams.legendPosition,
  ]);

  return (
    <div className="pieChart__container" data-test-subj="visTypePieChart">
      <div className="pieChart__wrapper">
        <LegendToggle
          onClick={toggleLegend}
          showLegend={showLegend}
          legendPosition={legendPosition}
        />
        <Chart size="100%">
          <Settings
            showLegend={showLegend}
            legendPosition={legendPosition}
            legendMaxDepth={visParams.nestedLegend ? undefined : 1}
            legendColorPicker={getColorPicker(legendPosition, setColor)}
            tooltip={tooltip}
            onElementClick={(args) => {
              handleFilterClick(args[0][0] as LayerValue[], bucketColumns, visData);
            }}
            legendAction={getLegendActions(
              canFilter,
              getFilterEventData(visData),
              handleFilterAction,
              visParams
            )}
            theme={chartTheme}
            baseTheme={chartBaseTheme}
            onRenderChange={onRenderChange}
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
