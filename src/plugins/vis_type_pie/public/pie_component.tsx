/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { memo, useCallback, useMemo, useState, useEffect } from 'react';

import {
  Chart,
  Datum,
  LayerValue,
  Partition,
  Position,
  Settings,
  RenderChangeListener,
  TooltipProps,
  TooltipType,
  SeriesIdentifier,
} from '@elastic/charts';
import {
  LegendToggle,
  ClickTriggerEvent,
  ChartsPluginSetup,
  PaletteRegistry,
} from '../../charts/public';
import { DataPublicPluginStart } from '../../data/public';
import type { PersistedState } from '../../visualizations/public';
import { Datatable, DatatableColumn, IInterpreterRenderHandlers } from '../../expressions/public';
import { PieVisParams, BucketColumns, ValueFormats } from './types';
import {
  getColorPicker,
  getLayers,
  getLegendActions,
  canFilter,
  getFilterClickData,
  getFilterEventData,
  getConfig,
  getColumns,
  getComplexAccessor,
} from './utils';
import { ChartSplit, SMALL_MULTIPLES_ID } from './components/chart_split';

import './chart.scss';

export interface PieComponentProps {
  visParams: PieVisParams;
  visData: Datatable;
  uiState: PersistedState;
  fireEvent: IInterpreterRenderHandlers['event'];
  renderComplete: IInterpreterRenderHandlers['done'];
  chartsThemeService: ChartsPluginSetup['theme'];
  palettes: ChartsPluginSetup['palettes'];
  services: DataPublicPluginStart;
  syncColors: boolean;
}

const PieComponent = (props: PieComponentProps) => {
  const chartTheme = props.chartsThemeService.useChartsTheme();
  const chartBaseTheme = props.chartsThemeService.useChartsBaseTheme();
  const [showLegend, setShowLegend] = useState<boolean>(() => {
    const bwcLegendStateDefault =
      props.visParams.addLegend == null ? false : props.visParams.addLegend;
    return props.uiState?.get('vis.legendOpen', bwcLegendStateDefault) as boolean;
  });
  const [palettesRegistry, setPalettesRegistry] = useState<PaletteRegistry | null>(null);

  const onRenderChange = useCallback<RenderChangeListener>(
    (isRendered) => {
      if (isRendered) {
        props.renderComplete();
      }
    },
    [props]
  );

  useEffect(() => {
    const fetchPalettes = async () => {
      const palettes = await props.palettes.getPalettes();
      setPalettesRegistry(palettes);
    };
    fetchPalettes();
  }, [props.palettes]);

  // handles slice click event
  const handleSliceClick = useCallback(
    (
      clickedLayers: LayerValue[],
      bucketColumns: Array<Partial<BucketColumns>>,
      visData: Datatable,
      splitChartDimension?: DatatableColumn | undefined
    ): void => {
      const data = getFilterClickData(clickedLayers, bucketColumns, visData, splitChartDimension);
      const event = {
        name: 'filterBucket',
        data: { data },
      };
      props.fireEvent(event);
    },
    [props]
  );

  // handles legend action event data
  const getLegendActionEventData = useCallback(
    (visData: Datatable) => (series: SeriesIdentifier): ClickTriggerEvent | null => {
      const data = getFilterEventData(visData, series);

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

  const handleLegendAction = useCallback(
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

  const toggleLegend = useCallback(() => {
    setShowLegend((value) => {
      const newValue = !value;
      props.uiState?.set('vis.legendOpen', newValue);
      return newValue;
    });
  }, [props.uiState]);

  useEffect(() => {
    setShowLegend(props.visParams.addLegend);
    props.uiState?.set('vis.legendOpen', props.visParams.addLegend);
  }, [props.uiState, props.visParams.addLegend]);

  const setColor = useCallback(
    (newColor: string | null, seriesLabel: string | number) => {
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

  const { visData, visParams, services, syncColors } = props;

  function getSliceValue(d: Datum, metricColumn: DatatableColumn) {
    if (typeof d[metricColumn.id] === 'number' && d[metricColumn.id] !== 0) {
      return d[metricColumn.id];
    }
    return Number.EPSILON;
  }

  // formatters
  const metricFieldFormatter = services.fieldFormats.deserialize(
    visParams.dimensions.metric.format
  );
  const percentFormatter = services.fieldFormats.deserialize({
    id: 'percent',
    params: {
      pattern: '0.[00]%',
    },
  });

  const { bucketColumns, metricColumn } = useMemo(() => getColumns(visParams, visData), [
    visData,
    visParams,
  ]);

  const layers = useMemo(
    () =>
      getLayers(
        bucketColumns,
        visParams,
        props.uiState?.get('vis.colors', {}),
        visData.rows,
        palettesRegistry,
        services.fieldFormats,
        syncColors
      ),
    [
      bucketColumns,
      visParams,
      props.uiState,
      visData.rows,
      palettesRegistry,
      services.fieldFormats,
      syncColors,
    ]
  );
  const config = useMemo(() => getConfig(visParams, chartTheme), [chartTheme, visParams]);
  const tooltip: TooltipProps = {
    type: visParams.addTooltip ? TooltipType.Follow : TooltipType.None,
  };
  const legendPosition = useMemo(() => visParams.legendPosition ?? Position.Right, [
    visParams.legendPosition,
  ]);

  const legendColorPicker = useMemo(
    () =>
      getColorPicker(
        legendPosition,
        setColor,
        bucketColumns,
        visParams.palette.name,
        visData.rows,
        props.uiState,
        visParams.distinctColors
      ),
    [
      legendPosition,
      setColor,
      bucketColumns,
      visParams.palette.name,
      visParams.distinctColors,
      visData.rows,
      props.uiState,
    ]
  );

  const splitChartColumnAccessor = visParams.dimensions.splitColumn
    ? getComplexAccessor(
        services.fieldFormats,
        visData.columns
      )(visParams.dimensions.splitColumn[0])
    : undefined;
  const splitChartRowAccessor = visParams.dimensions.splitRow
    ? getComplexAccessor(services.fieldFormats, visData.columns)(visParams.dimensions.splitRow[0])
    : undefined;

  const splitChartDimension = visParams.dimensions.splitColumn
    ? visData.columns[visParams.dimensions.splitColumn[0].accessor]
    : visParams.dimensions.splitRow
    ? visData.columns[visParams.dimensions.splitRow[0].accessor]
    : undefined;

  return (
    <div className="pieChart__container" data-test-subj="visTypePieChart">
      <div className="pieChart__wrapper">
        <LegendToggle
          onClick={toggleLegend}
          showLegend={showLegend}
          legendPosition={legendPosition}
        />
        <Chart size="100%">
          <ChartSplit
            splitColumnAccessor={splitChartColumnAccessor}
            splitRowAccessor={splitChartRowAccessor}
            splitColumn={splitChartDimension}
          />
          <Settings
            showLegend={showLegend}
            legendPosition={legendPosition}
            legendMaxDepth={visParams.nestedLegend ? undefined : 1}
            legendColorPicker={legendColorPicker}
            flatLegend={Boolean(splitChartDimension)}
            tooltip={tooltip}
            onElementClick={(args) => {
              handleSliceClick(
                args[0][0] as LayerValue[],
                bucketColumns,
                visData,
                splitChartDimension
              );
            }}
            legendAction={getLegendActions(
              canFilter,
              getLegendActionEventData(visData),
              handleLegendAction,
              visParams,
              services.actions,
              services.fieldFormats
            )}
            theme={chartTheme}
            baseTheme={chartBaseTheme}
            onRenderChange={onRenderChange}
          />
          <Partition
            id="pie"
            smallMultiples={SMALL_MULTIPLES_ID}
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
