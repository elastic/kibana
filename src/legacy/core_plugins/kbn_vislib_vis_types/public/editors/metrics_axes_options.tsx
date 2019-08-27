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

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { cloneDeep, capitalize, uniq, get } from 'lodash';
import { EuiSpacer } from '@elastic/eui';

import { AggConfig } from 'ui/vis';
import { safeMakeLabel } from 'ui/agg_types/agg_utils';
import { BasicVislibParams, ValueAxis, SeriesParam, Axis } from '../types';
import { ValidationVisOptionsProps } from '../controls/validation_wrapper';
import { SeriesPanel } from '../controls/point_series/series_panel';
import { CategoryAxisPanel } from '../controls/point_series/category_axis_panel';
import { ValueAxesPanel } from '../controls/point_series/value_axes_panel';
import { mapPositionOpposite, mapPosition } from '../controls/point_series/utils';
import { makeSerie, isAxisHorizontal, countNextAxisNumber } from './metrics_axes_options_helper';

export type SetParamByIndex = <P extends keyof ValueAxis, O extends keyof SeriesParam>(
  axesName: 'valueAxes' | 'seriesParams',
  index: number,
  paramName: P | O,
  value: ValueAxis[P] | SeriesParam[O]
) => void;

const VALUE_AXIS_PREFIX = 'ValueAxis-';
const AXIS_PREFIX = 'Axis-';

function MetricsAxisOptions(props: ValidationVisOptionsProps<BasicVislibParams>) {
  const { stateParams, setValue, aggs, setVisType, vis } = props;

  const [isCategoryAxisHorizontal, setIsCategoryAxisHorizontal] = useState(true);
  const [axesNumbers, setAxesNumbers] = useState({} as { [key: string]: number });

  const setParamByIndex: SetParamByIndex = useCallback(
    (axesName, index, paramName, value) => {
      const items = stateParams[axesName];
      const array = [...items] as typeof items;

      array[index] = {
        ...array[index],
        [paramName]: value,
      };

      setValue(axesName, array);
    },
    [stateParams, setValue]
  );

  // stores previous aggs' custom labels
  const [lastCustomLabels, setLastCustomLabels] = useState({} as { [key: string]: string });
  // stores previous aggs' field and type
  const [lastSeriesAgg, setLastSeriesAgg] = useState({} as {
    [key: string]: { type: string; field: string };
  });

  const updateAxisTitle = useCallback(() => {
    const axes = cloneDeep(stateParams.valueAxes);
    let isAxesChanged = false;
    const lastLabels = { ...lastCustomLabels };
    const lastMatchingSeriesAgg = { ...lastSeriesAgg };

    stateParams.valueAxes.forEach((axis, axisNumber) => {
      let newCustomLabel = '';
      const matchingSeries: AggConfig[] = [];

      stateParams.seriesParams.forEach((series, seriesIndex) => {
        if ((axisNumber === 0 && !series.valueAxis) || series.valueAxis === axis.id) {
          const aggByIndex = aggs.bySchemaName.metric[seriesIndex];
          matchingSeries.push(aggByIndex);
        }
      });

      if (matchingSeries.length === 1) {
        // if several series matches to the axis, axis title is set according to the first serie.
        newCustomLabel = matchingSeries[0].makeLabel();
      }

      if (lastCustomLabels[axis.id] !== newCustomLabel && newCustomLabel !== '') {
        const lastSeriesAggType = get(lastSeriesAgg, `${matchingSeries[0].id}.type`);
        const lastSeriesAggField = get(lastSeriesAgg, `${matchingSeries[0].id}.field`);
        const matchingSeriesAggType = get(matchingSeries, '[0]type.name', '');
        const matchingSeriesAggField = get(matchingSeries, '[0]params.field.name', '');

        const aggTypeIsChanged = lastSeriesAggType !== matchingSeriesAggType;
        const aggFieldIsChanged = lastSeriesAggField !== matchingSeriesAggField;

        lastMatchingSeriesAgg[matchingSeries[0].id] = {
          type: matchingSeriesAggType,
          field: matchingSeriesAggField,
        };
        lastLabels[axis.id] = newCustomLabel;

        if (
          aggTypeIsChanged ||
          aggFieldIsChanged ||
          axis.title.text === '' ||
          lastCustomLabels[axis.id] === axis.title.text
        ) {
          // Override axis title with new custom label
          axes[axisNumber] = { ...axes[axisNumber], title: { ...axis, text: newCustomLabel } };
          isAxesChanged = true;
        }
      }
    });

    if (isAxesChanged) {
      setValue('valueAxes', axes);
    }

    setLastSeriesAgg(lastMatchingSeriesAgg);
    setLastCustomLabels(lastLabels);
  }, [stateParams.valueAxes, stateParams.seriesParams, setValue]);

  const getUpdatedAxisName = useCallback(
    (axisPosition: ValueAxis['position']) => {
      const axisName = capitalize(axisPosition) + AXIS_PREFIX;
      const lastAxisNameNumber = axesNumbers[axisPosition];
      let nextAxisNameNumber;

      if (!lastAxisNameNumber) {
        nextAxisNameNumber = stateParams.valueAxes.reduce(countNextAxisNumber(axisName, 'name'), 1);
      } else {
        nextAxisNameNumber = lastAxisNameNumber + 1;
      }

      setAxesNumbers({ ...axesNumbers, [axisPosition]: nextAxisNameNumber });

      return `${axisName}${nextAxisNameNumber}`;
    },
    [stateParams.valueAxes, axesNumbers]
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
    [stateParams.valueAxes, getUpdatedAxisName]
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
    [stateParams.valueAxes, isCategoryAxisHorizontal, onValueAxisPositionChanged]
  );

  const addValueAxis = useCallback(() => {
    const lastAxisIdNumber = axesNumbers[VALUE_AXIS_PREFIX];
    let nextAxisIdNumber;

    if (!lastAxisIdNumber) {
      nextAxisIdNumber = stateParams.valueAxes.reduce(countNextAxisNumber(VALUE_AXIS_PREFIX), 1);
    } else {
      nextAxisIdNumber = lastAxisIdNumber + 1;
    }

    const newAxis = cloneDeep(stateParams.valueAxes[0]);
    newAxis.id = VALUE_AXIS_PREFIX + nextAxisIdNumber;
    newAxis.position = mapPositionOpposite(newAxis.position);

    newAxis.name = getUpdatedAxisName(newAxis.position);

    setAxesNumbers({
      ...axesNumbers,
      [VALUE_AXIS_PREFIX]: nextAxisIdNumber,
    });
    setValue('valueAxes', [...stateParams.valueAxes, newAxis]);
    return newAxis;
  }, [stateParams.valueAxes, axesNumbers]);

  const removeValueAxis = useCallback(
    (axis: ValueAxis) => {
      const newValueAxes = stateParams.valueAxes.filter(valAxis => valAxis.id !== axis.id);
      setValue('valueAxes', newValueAxes);

      const lastNumber = axesNumbers[VALUE_AXIS_PREFIX];

      if (lastNumber === parseInt(axis.id.substr(VALUE_AXIS_PREFIX.length), 10)) {
        setAxesNumbers({
          ...axesNumbers,
          [VALUE_AXIS_PREFIX]: lastNumber - 1,
        });
      }

      let chartIndex;
      stateParams.seriesParams.forEach(({ valueAxis }, index) => {
        if (axis.id === valueAxis) {
          chartIndex = index;
        }
      });

      if (chartIndex !== undefined) {
        // if a seriesParam has valueAxis equals to removed one, then we reset it to the first valueAxis
        setParamByIndex('seriesParams', chartIndex, 'valueAxis', newValueAxes[0].id);
      }
    },
    [stateParams.seriesParams, stateParams.valueAxes, setParamByIndex, setValue]
  );

  const aggsLabel = aggs
    .map(agg => {
      return safeMakeLabel(agg);
    })
    .join();

  const metrics = useMemo(() => {
    const schemaName = vis.type.schemas.metrics[0].name;
    return aggs.bySchemaName[schemaName];
  }, [vis.type.schemas.metrics[0].name, aggs, aggsLabel]);

  useEffect(() => {
    // update labels for existing params or create new one
    const updatedSeries = metrics.map(agg => {
      const params = stateParams.seriesParams.find(param => param.data.id === agg.id);
      const label = agg.makeLabel();

      if (params) {
        return {
          ...params,
          data: {
            ...params.data,
            label,
          },
        };
      } else {
        const series = makeSerie(
          agg.id,
          label,
          stateParams.seriesParams,
          stateParams.valueAxes[0].id
        );
        return series;
      }
    });

    setValue('seriesParams', updatedSeries);
  }, [aggsLabel, metrics, stateParams.valueAxes]);

  const visType = useMemo(() => {
    const types = uniq(stateParams.seriesParams.map(({ type }) => type));
    return types.length === 1 ? types[0] : 'histogram';
  }, [stateParams.seriesParams]);

  useEffect(() => {
    setVisType(visType);
  }, [visType, setVisType]);

  useEffect(() => {
    updateAxisTitle();
  }, [aggsLabel]);

  return (
    <>
      <SeriesPanel
        addValueAxis={addValueAxis}
        updateAxisTitle={updateAxisTitle}
        setParamByIndex={setParamByIndex}
        {...props}
      />
      <EuiSpacer size="s" />
      <ValueAxesPanel
        addValueAxis={addValueAxis}
        isCategoryAxisHorizontal={isCategoryAxisHorizontal}
        removeValueAxis={removeValueAxis}
        onValueAxisPositionChanged={onValueAxisPositionChanged}
        setParamByIndex={setParamByIndex}
        {...props}
      />
      <EuiSpacer size="s" />
      <CategoryAxisPanel {...props} onPositionChanged={onCategoryAxisPositionChanged} />
    </>
  );
}

export { MetricsAxisOptions };
