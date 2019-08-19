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

import React from 'react';
import { cloneDeep, capitalize } from 'lodash';
import { EuiSpacer } from '@elastic/eui';

import { VisOptionsProps } from 'ui/vis/editors/default';
import { BasicVislibParams } from '../types';
import { SeriesPanel } from '../controls/point_series/series_panel';
import { CategoryAxisPanel } from '../controls/point_series/category_axis_panel';
import { ValueAxesPanel } from '../controls/point_series/value_axes_panel';
import { mapPositionOpposite } from '../controls/point_series/utils';

function MetricsAxisOptions(props: VisOptionsProps<BasicVislibParams>) {
  const { stateParams, setValue } = props;

  const addValueAxis = () => {
    const firstAxis = stateParams.valueAxes[0];
    const newAxis = cloneDeep(firstAxis);
    newAxis.id =
      'ValueAxis-' +
      stateParams.valueAxes.reduce((value, axis) => {
        if (axis.id.substr(0, 10) === 'ValueAxis-') {
          const num = parseInt(axis.id.substr(10), 10);
          if (num >= value) value = num + 1;
        }
        return value;
      }, 1);

    newAxis.position = mapPositionOpposite(firstAxis.position);
    const axisName = capitalize(newAxis.position) + 'Axis-';
    newAxis.name =
      axisName +
      stateParams.valueAxes.reduce((value, axis) => {
        if (axis.name.substr(0, axisName.length) === axisName) {
          const num = parseInt(axis.name.substr(axisName.length), 10);
          if (num >= value) value = num + 1;
        }
        return value;
      }, 1);

    setValue('valueAxes', [...stateParams.valueAxes, newAxis]);
    return newAxis;
  };

  return (
    <>
      <SeriesPanel addValueAxis={addValueAxis} {...props} />
      <EuiSpacer size="s" />
      <ValueAxesPanel addValueAxis={addValueAxis} {...props} />
      <EuiSpacer size="s" />
      <CategoryAxisPanel {...props} />
    </>
  );
}

export { MetricsAxisOptions };
