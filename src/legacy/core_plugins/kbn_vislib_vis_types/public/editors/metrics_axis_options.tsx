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
import { VisOptionsProps } from 'ui/vis/editors/default';
import { safeMakeLabel } from 'ui/agg_types/agg_utils';
import { BasicVislibParams, ValueAxis, SeriesParam } from '../types';
import { SeriesPanel } from '../controls/point_series/series_panel';
import { CategoryAxisPanel } from '../controls/point_series/category_axis_panel';
import { ValueAxesPanel } from '../controls/point_series/value_axes_panel';
import { mapPositionOpposite, mapPosition } from '../controls/point_series/utils';
import { makeSerie, isAxisHorizontal, countNextAxisNumber } from './metrics_axis_options_helper';

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

const RADIX = 10;
const VALUE_AXIS_PREFIX = 'ValueAxis-';
const AXIS_PREFIX = 'Axis-';

function MetricsAxisOptions(props: VisOptionsProps<BasicVislibParams>) {
  const { stateParams, setValue, aggs, setVisType, vis } = props;

  const [lastCustomLabels, setLastCustomLabels] = useState({} as { [key: string]: string });
  const [isCategoryAxisHorizontal, setIsCategoryAxisHorizontal] = useState(true);
  // We track these so we can know when the agg is changed
  const [lastMatchingSeriesAggType, setLastMatchingSeriesAggType] = useState('');
  const [lastMatchingSeriesAggField, setLastMatchingSeriesAggField] = useState('');

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

  const updateAxisTitle = () => {
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

      const matchingSeriesAggType = get(matchingSeries, '[0]type.name', '');
      const matchingSeriesAggField = get(matchingSeries, '[0]params.field.name', '');

      if (lastCustomLabels[axis.id] !== newCustomLabel && newCustomLabel !== '') {
        const aggTypeIsChanged = lastMatchingSeriesAggType !== matchingSeriesAggType;
        const aggFieldIsChanged = lastMatchingSeriesAggField !== matchingSeriesAggField;
        const aggIsChanged = aggTypeIsChanged || aggFieldIsChanged;
        const lastCustomLabelMatchesAxisTitle = lastCustomLabels[axis.id] === axis.title.text;
        const isFirstRender = Object.keys(lastCustomLabels).length === 0;

        if (
          !isFirstRender &&
          (aggIsChanged || axis.title.text === '' || lastCustomLabelMatchesAxisTitle)
        ) {
          // Override axis title with new custom label
          setValueAxisByIndex(axisNumber, 'title', { ...axis, text: newCustomLabel });
        }

        setLastCustomLabels({ ...lastCustomLabels, [axis.id]: newCustomLabel });
      }

      setLastMatchingSeriesAggType(matchingSeriesAggType);
      setLastMatchingSeriesAggField(matchingSeriesAggField);
    });
  };

  const getUpdatedAxisName = useCallback(
    (axisPosition: ValueAxis['position']) => {
      let axisName = capitalize(axisPosition) + AXIS_PREFIX;
      axisName += stateParams.valueAxes.reduce((numberValue: number, axisItem: ValueAxis) => {
        if (axisItem.name.substr(0, axisName.length) === axisName) {
          const num = parseInt(axisItem.name.substr(axisName.length), RADIX);
          if (num >= numberValue) {
            numberValue = num + 1;
          }
        }
        return numberValue;
      }, 1);
      return axisName;
    },
    [stateParams.valueAxes]
  );

  const addValueAxis = useCallback(() => {
    const firstAxis = stateParams.valueAxes[0];
    const newAxis = cloneDeep(firstAxis);
    newAxis.id =
      VALUE_AXIS_PREFIX + stateParams.valueAxes.reduce(countNextAxisNumber(VALUE_AXIS_PREFIX), 1);
    newAxis.position = mapPositionOpposite(firstAxis.position);

    const axisName = capitalize(newAxis.position) + AXIS_PREFIX;
    newAxis.name = axisName + stateParams.valueAxes.reduce(countNextAxisNumber(axisName), 1);

    setValue('valueAxes', [...stateParams.valueAxes, newAxis]);
    return newAxis;
  }, [stateParams.valueAxes, setValue]);

  const removeValueAxis = useCallback(
    (axis: ValueAxis) => {
      setValue('valueAxes', stateParams.valueAxes.filter(valAxis => valAxis.id !== axis.id));

      let chartIndex;
      stateParams.seriesParams.forEach(({ valueAxis }, index) => {
        if (axis.id === valueAxis) {
          chartIndex = index;
        }
      });

      if (chartIndex !== undefined) {
        setChartByIndex(chartIndex, 'valueAxis', axis.id);
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
    updateAxisTitle();

    const schemaTitle = vis.type.schemas.metrics[0].title;

    const metrics = aggs.filter(agg => {
      const isMetric = agg.type && agg.type.type === 'metrics';
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

  useEffect(() => {
    const chartPosition = stateParams.categoryAxes[0].position;
    setIsCategoryAxisHorizontal(isAxisHorizontal(chartPosition));

    stateParams.valueAxes.forEach((axis, index) => {
      const axisIsHorizontal = isAxisHorizontal(axis.position);

      if (axisIsHorizontal === isCategoryAxisHorizontal) {
        const position = mapPosition(axis.position);
        setValueAxisByIndex(index, 'position', position);
        setValueAxisByIndex(index, 'name', getUpdatedAxisName(position));
      }
    });
  }, [
    isCategoryAxisHorizontal,
    stateParams.categoryAxes,
    stateParams.valueAxes,
    getUpdatedAxisName,
    setValueAxisByIndex,
  ]);

  const seriesParamsTypes = stateParams.seriesParams.map(({ type }) => type);
  const seriesParamsTypesString = seriesParamsTypes.join();

  useEffect(() => {
    const types = uniq(seriesParamsTypes);
    setVisType(vis, types.length === 1 ? types[0] : 'histogram');
  }, [seriesParamsTypes, seriesParamsTypesString, vis, setVisType]);

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
        getUpdatedAxisName={getUpdatedAxisName}
        setValueAxisByIndex={setValueAxisByIndex}
        {...props}
      />
      <EuiSpacer size="s" />
      <CategoryAxisPanel {...props} />
    </>
  );
}

export { MetricsAxisOptions };
