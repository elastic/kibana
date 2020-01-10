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
import { cloneDeep, uniq, get } from 'lodash';
import { EuiSpacer } from '@elastic/eui';

import { AggConfig } from '../../../legacy_imports';
import { BasicVislibParams, ValueAxis, SeriesParam, Axis } from '../../../types';
import { ValidationVisOptionsProps } from '../../common';
import { SeriesPanel } from './series_panel';
import { CategoryAxisPanel } from './category_axis_panel';
import { ValueAxesPanel } from './value_axes_panel';
import {
  makeSerie,
  isAxisHorizontal,
  countNextAxisNumber,
  getUpdatedAxisName,
  mapPositionOpposite,
  mapPosition,
} from './utils';

export type SetParamByIndex = <P extends keyof ValueAxis, O extends keyof SeriesParam>(
  axesName: 'valueAxes' | 'seriesParams',
  index: number,
  paramName: P | O,
  value: ValueAxis[P] | SeriesParam[O]
) => void;

export type ChangeValueAxis = (
  index: number,
  paramName: 'valueAxis',
  selectedValueAxis: string
) => void;

const VALUE_AXIS_PREFIX = 'ValueAxis-';

function MetricsAxisOptions(props: ValidationVisOptionsProps<BasicVislibParams>) {
  const { stateParams, setValue, aggs, aggsLabels, setVisType, vis } = props;

  const [isCategoryAxisHorizontal, setIsCategoryAxisHorizontal] = useState(true);

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

  const setCategoryAxis = useCallback(
    (value: Axis) => {
      const categoryAxes = [...stateParams.categoryAxes];
      categoryAxes[0] = value;
      setValue('categoryAxes', categoryAxes);
    },
    [setValue, stateParams.categoryAxes]
  );

  // stores previous aggs' custom labels
  const [lastCustomLabels, setLastCustomLabels] = useState({} as { [key: string]: string });
  // stores previous aggs' field and type
  const [lastSeriesAgg, setLastSeriesAgg] = useState(
    {} as {
      [key: string]: { type: string; field: string };
    }
  );

  const updateAxisTitle = () => {
    const axes = cloneDeep(stateParams.valueAxes);
    let isAxesChanged = false;
    const lastLabels = { ...lastCustomLabels };
    const lastMatchingSeriesAgg = { ...lastSeriesAgg };

    stateParams.valueAxes.forEach((axis, axisNumber) => {
      let newCustomLabel = '';
      const matchingSeries: AggConfig[] = [];

      stateParams.seriesParams.forEach((series, seriesIndex) => {
        if ((axisNumber === 0 && !series.valueAxis) || series.valueAxis === axis.id) {
          const aggByIndex = aggs.bySchemaName('metric')[seriesIndex];
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
          Object.keys(lastCustomLabels).length !== 0 &&
          (aggTypeIsChanged ||
            aggFieldIsChanged ||
            axis.title.text === '' ||
            lastCustomLabels[axis.id] === axis.title.text)
        ) {
          // Override axis title with new custom label
          axes[axisNumber] = {
            ...axis,
            title: { ...axis.title, text: newCustomLabel },
          };
          isAxesChanged = true;
        }
      }
    });

    if (isAxesChanged) {
      setValue('valueAxes', axes);
    }

    setLastSeriesAgg(lastMatchingSeriesAgg);
    setLastCustomLabels(lastLabels);
  };

  const onValueAxisPositionChanged = useCallback(
    (index: number, value: ValueAxis['position']) => {
      const valueAxes = [...stateParams.valueAxes];
      const name = getUpdatedAxisName(value, valueAxes);

      valueAxes[index] = {
        ...valueAxes[index],
        name,
        position: value,
      };
      setValue('valueAxes', valueAxes);
    },
    [stateParams.valueAxes, getUpdatedAxisName, setValue]
  );

  const onCategoryAxisPositionChanged = useCallback(
    (chartPosition: Axis['position']) => {
      const isChartHorizontal = isAxisHorizontal(chartPosition);
      setIsCategoryAxisHorizontal(isAxisHorizontal(chartPosition));

      stateParams.valueAxes.forEach((axis, index) => {
        if (isAxisHorizontal(axis.position) === isChartHorizontal) {
          const position = mapPosition(axis.position);
          onValueAxisPositionChanged(index, position);
        }
      });
    },
    [stateParams.valueAxes, onValueAxisPositionChanged]
  );

  const addValueAxis = useCallback(() => {
    const nextAxisIdNumber = stateParams.valueAxes.reduce(
      countNextAxisNumber(VALUE_AXIS_PREFIX),
      1
    );

    const newAxis = cloneDeep(stateParams.valueAxes[0]);
    newAxis.id = VALUE_AXIS_PREFIX + nextAxisIdNumber;
    newAxis.position = mapPositionOpposite(newAxis.position);
    newAxis.name = getUpdatedAxisName(newAxis.position, stateParams.valueAxes);

    setValue('valueAxes', [...stateParams.valueAxes, newAxis]);
    return newAxis;
  }, [stateParams.valueAxes, setValue]);

  const removeValueAxis = useCallback(
    (axis: ValueAxis) => {
      const newValueAxes = stateParams.valueAxes.filter(valAxis => valAxis.id !== axis.id);

      setValue('valueAxes', newValueAxes);

      let isSeriesUpdated = false;
      const series = stateParams.seriesParams.map(ser => {
        if (axis.id === ser.valueAxis) {
          isSeriesUpdated = true;
          return { ...ser, valueAxis: newValueAxes[0].id };
        }
        return ser;
      });

      if (isSeriesUpdated) {
        // if seriesParams have valueAxis equals to removed one, then we reset it to the first valueAxis
        setValue('seriesParams', series);
      }

      if (stateParams.grid.valueAxis === axis.id) {
        // reset Y-axis grid lines setting
        setValue('grid', { ...stateParams.grid, valueAxis: undefined });
      }
    },
    [stateParams.seriesParams, stateParams.valueAxes, setValue]
  );

  const changeValueAxis: ChangeValueAxis = useCallback(
    (index, paramName, selectedValueAxis) => {
      let newValueAxis = selectedValueAxis;
      if (selectedValueAxis === 'new') {
        const axis = addValueAxis();
        newValueAxis = axis.id;
      }

      setParamByIndex('seriesParams', index, paramName, newValueAxis);

      updateAxisTitle();
    },
    [addValueAxis, setParamByIndex]
  );

  const metrics = useMemo(() => {
    const schemaName = vis.type.schemas.metrics[0].name;
    return aggs.bySchemaName(schemaName);
  }, [vis.type.schemas.metrics[0].name, aggs, aggsLabels]);

  const firstValueAxesId = stateParams.valueAxes[0].id;

  useEffect(() => {
    const updatedSeries = metrics.map(agg => {
      const params = stateParams.seriesParams.find(param => param.data.id === agg.id);
      const label = agg.makeLabel();

      // update labels for existing params or create new one
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
          firstValueAxesId,
          stateParams.seriesParams[stateParams.seriesParams.length - 1]
        );
        return series;
      }
    });

    setValue('seriesParams', updatedSeries);
  }, [aggsLabels, metrics, firstValueAxesId]);

  const visType = useMemo(() => {
    const types = uniq(stateParams.seriesParams.map(({ type }) => type));
    return types.length === 1 ? types[0] : 'histogram';
  }, [stateParams.seriesParams]);

  useEffect(() => {
    setVisType(visType);
  }, [visType]);

  useEffect(() => {
    updateAxisTitle();
  }, [aggsLabels]);

  return (
    <>
      <SeriesPanel setParamByIndex={setParamByIndex} changeValueAxis={changeValueAxis} {...props} />
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
      <CategoryAxisPanel
        {...props}
        axis={stateParams.categoryAxes[0]}
        onPositionChanged={onCategoryAxisPositionChanged}
        setCategoryAxis={setCategoryAxis}
      />
    </>
  );
}

export { MetricsAxisOptions };
