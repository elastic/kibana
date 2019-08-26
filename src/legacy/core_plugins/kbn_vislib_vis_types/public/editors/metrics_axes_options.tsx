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

import React, { useState, useEffect, useCallback } from 'react';
import { cloneDeep, capitalize, get, uniq } from 'lodash';
import { EuiSpacer } from '@elastic/eui';

import { AggConfig } from 'ui/vis';
import { AggGroupNames } from 'ui/vis/editors/default';
import { safeMakeLabel } from 'ui/agg_types/agg_utils';
import { BasicVislibParams, ValueAxis, SeriesParam, Axis } from '../types';
import { ValidationVisOptionsProps } from '../controls/validation_wrapper';
import { SeriesPanel } from '../controls/point_series/series_panel';
import { CategoryAxisPanel } from '../controls/point_series/category_axis_panel';
import { ValueAxesPanel } from '../controls/point_series/value_axes_panel';
import { mapPositionOpposite, mapPosition } from '../controls/point_series/utils';
import { makeSerie, isAxisHorizontal, countNextAxisNumber } from './metrics_axes_options_helper';

export type SetChartValueByIndex = <T extends keyof SeriesParam>(
  index: number,
  paramName: T,
  value: SeriesParam[T]
) => void;

export type SetValueAxisByIndex = <T extends keyof ValueAxis>(
  index: number,
  paramName: T,
  value: ValueAxis[T]
) => void;

const VALUE_AXIS_PREFIX = 'ValueAxis-';
const AXIS_PREFIX = 'Axis-';

function MetricsAxisOptions(props: ValidationVisOptionsProps<BasicVislibParams>) {
  const { stateParams, setValue, aggs, setVisType, vis } = props;

  const [isCategoryAxisHorizontal, setIsCategoryAxisHorizontal] = useState(true);
  const [axesNumbers, setAxesNumbers] = useState({} as { [key: string]: number });

  const setValueAxisByIndex: SetValueAxisByIndex = useCallback(
    (index, paramName, value) => {
      const valueAxes = [...stateParams.valueAxes];

      valueAxes[index] = {
        ...valueAxes[index],
        [paramName]: value,
      };
      setValue('valueAxes', valueAxes);
    },
    [stateParams.valueAxes, setValue]
  );

  const setChartByIndex: SetChartValueByIndex = useCallback(
    (index, paramName, value) => {
      const series = [...stateParams.seriesParams];
      series[index] = {
        ...series[index],
        [paramName]: value,
      };
      setValue('seriesParams', series);
    },
    [stateParams.seriesParams, setValue]
  );

  const updateAxisTitle = useCallback(() => {
    const axes = [...stateParams.valueAxes];

    stateParams.valueAxes.forEach((axis, axisNumber) => {
      let newCustomLabel = '';
      const isFirst = axisNumber === 0;
      const matchingSeries: AggConfig[] = [];

      stateParams.seriesParams.forEach((series, seriesIndex) => {
        if ((isFirst && !series.valueAxis) || series.valueAxis === axis.id) {
          let seriesNumber = 0;
          aggs.forEach((agg: AggConfig) => {
            if (agg.schema.name === 'metric') {
              if (seriesNumber === seriesIndex) {
                matchingSeries.push(agg);
              }
              seriesNumber++;
            }
          });
        }
      });

      if (matchingSeries.length === 1) {
        newCustomLabel = matchingSeries[0].makeLabel();
      }

      if (newCustomLabel !== '') {
        // Override axis title with new custom label
        axes[axisNumber] = { ...axes[axisNumber], title: { ...axis, text: newCustomLabel } };
      }
    });

    setValue('valueAxes', axes);
  }, [stateParams.valueAxes, stateParams.seriesParams]);

  const getUpdatedAxisName = useCallback(
    (axisPosition: ValueAxis['position']) => {
      const axisName = capitalize(axisPosition) + AXIS_PREFIX;
      let lastAxisNameNumber = axesNumbers[axisPosition];

      if (!lastAxisNameNumber) {
        lastAxisNameNumber = stateParams.valueAxes.reduce(countNextAxisNumber(axisName, 'name'), 0);
      }
      const nextAxisNameNumber = lastAxisNameNumber + 1;
      setAxesNumbers({ ...axesNumbers, [axisPosition]: nextAxisNameNumber });

      return `${axisName}${nextAxisNameNumber}`;
    },
    [stateParams.valueAxes, axesNumbers, setAxesNumbers, countNextAxisNumber]
  );

  const onValueAxisPositionChanged = useCallback(
    (index: number, value: ValueAxis['position']) => {
      const valueAxes = [...stateParams.valueAxes];

      valueAxes[index] = {
        ...valueAxes[index],
        name: getUpdatedAxisName(value),
        position: value,
      };
      setValue('valueAxes', valueAxes);
    },
    [stateParams.valueAxes, setValue, getUpdatedAxisName]
  );

  const onCategoryAxisPositionChanged = useCallback(
    (chartPosition: Axis['position']) => {
      const isChartHorizontal = isAxisHorizontal(chartPosition);
      if (isChartHorizontal !== isCategoryAxisHorizontal) {
        setIsCategoryAxisHorizontal(isChartHorizontal);
      }

      stateParams.valueAxes.forEach((axis, index) => {
        if (isAxisHorizontal(axis.position) === isChartHorizontal) {
          const position = mapPosition(axis.position);
          onValueAxisPositionChanged(index, position);
        }
      });
    },
    [
      stateParams.valueAxes,
      isCategoryAxisHorizontal,
      setIsCategoryAxisHorizontal,
      isAxisHorizontal,
      onValueAxisPositionChanged,
      mapPosition,
    ]
  );

  const addValueAxis = useCallback(() => {
    let lastAxisIdNumber = axesNumbers[VALUE_AXIS_PREFIX];

    if (!lastAxisIdNumber) {
      lastAxisIdNumber = stateParams.valueAxes.reduce(countNextAxisNumber(VALUE_AXIS_PREFIX), 0);
    }

    const newAxis = cloneDeep(stateParams.valueAxes[0]);
    const nextAxisIdNumber = lastAxisIdNumber + 1;
    newAxis.id = VALUE_AXIS_PREFIX + nextAxisIdNumber;
    newAxis.position = mapPositionOpposite(newAxis.position);

    newAxis.name = getUpdatedAxisName(newAxis.position);

    setAxesNumbers({
      ...axesNumbers,
      [VALUE_AXIS_PREFIX]: nextAxisIdNumber,
    });
    setValue('valueAxes', [...stateParams.valueAxes, newAxis]);
    return newAxis;
  }, [
    stateParams.valueAxes,
    axesNumbers,
    countNextAxisNumber,
    mapPositionOpposite,
    setAxesNumbers,
    setValue,
  ]);

  const removeValueAxis = useCallback(
    (axis: ValueAxis) => {
      const newValueAxes = stateParams.valueAxes.filter(valAxis => valAxis.id !== axis.id);
      setValue('valueAxes', newValueAxes);

      let chartIndex;
      stateParams.seriesParams.forEach(({ valueAxis }, index) => {
        if (axis.id === valueAxis) {
          chartIndex = index;
        }
      });

      if (chartIndex !== undefined) {
        // if a seriesParam has valueAxis equals to removed one, then we reset it to the first valueAxis
        setChartByIndex(chartIndex, 'valueAxis', newValueAxes[0].id);
      }
    },
    [stateParams.seriesParams, stateParams.valueAxes, setChartByIndex, setValue]
  );

  const aggsLabel = aggs
    .map(agg => {
      return safeMakeLabel(agg);
    })
    .join();

  useEffect(() => {
    const schemaTitle = vis.type.schemas.metrics[0].title;

    const metrics = aggs.filter(agg => {
      const isMetric = agg.type && agg.type.type === AggGroupNames.Metrics;
      return isMetric && agg.schema.title === schemaTitle;
    });

    // update labels for existing params or create new one
    const updatedSeries = metrics.map(agg => {
      const params = stateParams.seriesParams.find(param => param.data.id === agg.id);
      if (params) {
        return {
          ...params,
          data: {
            ...params.data,
            label: agg.makeLabel(),
          },
        };
      } else {
        const series = makeSerie(
          agg.id,
          agg.makeLabel(),
          stateParams.seriesParams,
          stateParams.valueAxes[0].id
        );
        return series;
      }
    });

    setValue('seriesParams', updatedSeries);
  }, [aggsLabel, stateParams.valueAxes]);

  const seriesParamsTypes = uniq(stateParams.seriesParams.map(({ type }) => type));

  useEffect(() => {
    setVisType(vis.type, seriesParamsTypes.length === 1 ? seriesParamsTypes[0] : 'histogram');
  }, [seriesParamsTypes, vis, setVisType]);

  return (
    <>
      <SeriesPanel
        addValueAxis={addValueAxis}
        updateAxisTitle={updateAxisTitle}
        setChartByIndex={setChartByIndex}
        {...props}
      />
      <EuiSpacer size="s" />
      <ValueAxesPanel
        addValueAxis={addValueAxis}
        isCategoryAxisHorizontal={isCategoryAxisHorizontal}
        removeValueAxis={removeValueAxis}
        onValueAxisPositionChanged={onValueAxisPositionChanged}
        setValueAxisByIndex={setValueAxisByIndex}
        {...props}
      />
      <EuiSpacer size="s" />
      <CategoryAxisPanel {...props} onPositionChanged={onCategoryAxisPositionChanged} />
    </>
  );
}

export { MetricsAxisOptions };
