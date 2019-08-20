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

import React, { useState, useEffect } from 'react';
import { cloneDeep, capitalize, get } from 'lodash';
import { EuiSpacer } from '@elastic/eui';

import { AggConfig } from 'ui/vis';
import { VisOptionsProps } from 'ui/vis/editors/default';
import { safeMakeLabel } from 'ui/agg_types/agg_utils';
import { BasicVislibParams, ValueAxis } from '../types';
import { LegendPositions } from '../utils/collections';
import { SeriesPanel } from '../controls/point_series/series_panel';
import { CategoryAxisPanel } from '../controls/point_series/category_axis_panel';
import { ValueAxesPanel } from '../controls/point_series/value_axes_panel';
import { SetValueAxisByIndex } from '../controls/point_series/components/value_axis_options';
import { mapPositionOpposite, mapPosition } from '../controls/point_series/utils';

const RADIX = 10;
const VALUE_AXIS_PREFIX = 'ValueAxis-';
const AXIS_PREFIX = 'Axis-';

function reduceFn(axisName: string) {
  return (value: number, axis: ValueAxis) => {
    const nameLength = axisName.length;
    if (axis.id.substr(0, nameLength) === axisName) {
      const num = parseInt(axis.id.substr(nameLength), RADIX);
      if (num >= value) {
        value = num + 1;
      }
    }
    return value;
  };
}

function MetricsAxisOptions(props: VisOptionsProps<BasicVislibParams>) {
  const { stateParams, setValue, aggs } = props;

  const [lastCustomLabels, setLastCustomLabels] = useState({} as { [key: string]: string });
  // We track these so we can know when the agg is changed
  const [lastMatchingSeriesAggType, setLastMatchingSeriesAggType] = useState('');
  const [lastMatchingSeriesAggField, setLastMatchingSeriesAggField] = useState('');
  const [isCategoryAxisHorizontal, setIsCategoryAxisHorizontal] = useState(true);

  const addValueAxis = () => {
    const firstAxis = stateParams.valueAxes[0];
    const newAxis = cloneDeep(firstAxis);
    newAxis.id = VALUE_AXIS_PREFIX + stateParams.valueAxes.reduce(reduceFn(VALUE_AXIS_PREFIX), 1);
    newAxis.position = mapPositionOpposite(firstAxis.position);

    const axisName = capitalize(newAxis.position) + AXIS_PREFIX;
    newAxis.name = axisName + stateParams.valueAxes.reduce(reduceFn(axisName), 1);

    setValue('valueAxes', [...stateParams.valueAxes, newAxis]);
    return newAxis;
  };

  const updateAxisTitle = () => {
    stateParams.valueAxes.forEach((axis, axisNumber) => {
      let newCustomLabel = '';
      const isFirst = axisNumber === 0;
      const matchingSeries: AggConfig[] = [];

      stateParams.seriesParams.forEach((series, i) => {
        const isMatchingSeries = (isFirst && !series.valueAxis) || series.valueAxis === axis.id;
        if (isMatchingSeries) {
          let seriesNumber = 0;
          aggs.forEach((agg: AggConfig) => {
            if (agg.schema.name === 'metric') {
              if (seriesNumber === i) {
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
        const isFirstRender = Object.keys(lastCustomLabels).length === 0;
        const aggTypeIsChanged = lastMatchingSeriesAggType !== matchingSeriesAggType;
        const aggFieldIsChanged = lastMatchingSeriesAggField !== matchingSeriesAggField;
        const aggIsChanged = aggTypeIsChanged || aggFieldIsChanged;
        const axisTitleIsEmpty = axis.title.text === '';
        const lastCustomLabelMatchesAxisTitle = lastCustomLabels[axis.id] === axis.title.text;

        if (
          !isFirstRender &&
          (aggIsChanged || axisTitleIsEmpty || lastCustomLabelMatchesAxisTitle)
        ) {
          axis.title.text = newCustomLabel; // Override axis title with new custom label
        }

        setLastCustomLabels({ ...lastCustomLabels, [axis.id]: newCustomLabel });
      }

      setLastMatchingSeriesAggType(matchingSeriesAggType);
      setLastMatchingSeriesAggField(matchingSeriesAggField);
    });
  };

  const setValueAxis: SetValueAxisByIndex = (index, paramName, value) => {
    const valueAxes = [...stateParams.valueAxes];

    valueAxes[index] = {
      ...valueAxes[index],
      [paramName]: value,
    };
    setValue('valueAxes', valueAxes);
  };

  const updateAxisName = (axis: ValueAxis, index: number) => {
    let axisName = capitalize(axis.position) + AXIS_PREFIX;
    axisName += stateParams.valueAxes.reduce((numberValue: number, axisItem: ValueAxis) => {
      if (axisItem.name.substr(0, axisName.length) === axisName) {
        const num = parseInt(axisItem.name.substr(axisName.length), RADIX);
        if (num >= numberValue) {
          numberValue = num + 1;
        }
      }
      return numberValue;
    }, 1);
    setValueAxis(index, 'name', axisName);
  };

  const aggsLabel = aggs
    .map(agg => {
      return safeMakeLabel(agg);
    })
    .join();

  useEffect(updateAxisTitle, [aggsLabel]);

  useEffect(() => {
    const position = stateParams.categoryAxes[0].position;
    setIsCategoryAxisHorizontal([LegendPositions.TOP, LegendPositions.BOTTOM].includes(position));
    stateParams.valueAxes.forEach((axis, index) => {
      const axisIsHorizontal = [LegendPositions.TOP, LegendPositions.BOTTOM].includes(
        axis.position
      );
      if (axisIsHorizontal === isCategoryAxisHorizontal) {
        axis.position = mapPosition(axis.position);
        updateAxisName(axis, index);
      }
    });
  }, [stateParams.categoryAxes[0].position]);

  return (
    <>
      <SeriesPanel addValueAxis={addValueAxis} updateAxisTitle={updateAxisTitle} {...props} />
      <EuiSpacer size="s" />
      <ValueAxesPanel
        addValueAxis={addValueAxis}
        isCategoryAxisHorizontal={isCategoryAxisHorizontal}
        updateAxisName={updateAxisName}
        setValueAxisByIndex={setValueAxis}
        {...props}
      />
      <EuiSpacer size="s" />
      <CategoryAxisPanel {...props} />
    </>
  );
}

export { MetricsAxisOptions };
