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

import { ChartModes, ChartTypes, InterpolationModes } from '../utils/collections';
import { ValueAxis, SeriesParam } from '../types';
import { Positions } from '../utils/collections';

const makeSerie = (
  id: string,
  label: string,
  lastSerie: SeriesParam,
  defaultValueAxis: ValueAxis['id']
): SeriesParam => {
  return {
    show: true,
    mode: lastSerie ? lastSerie.mode : ChartModes.NORMAL,
    type: lastSerie ? lastSerie.type : ChartTypes.LINE,
    drawLinesBetweenPoints: lastSerie ? lastSerie.drawLinesBetweenPoints : true,
    showCircles: lastSerie ? lastSerie.showCircles : true,
    interpolate: lastSerie ? lastSerie.interpolate : InterpolationModes.LINEAR,
    lineWidth: lastSerie ? lastSerie.lineWidth : 2,
    data: {
      id,
      label,
    },
    valueAxis: lastSerie ? lastSerie.valueAxis : defaultValueAxis,
  };
};

const isAxisHorizontal = (position: Positions) =>
  [Positions.TOP, Positions.BOTTOM].includes(position);

const RADIX = 10;

function countNextAxisNumber(axisName: string, axisProp: 'id' | 'name' = 'id') {
  return (value: number, axis: ValueAxis) => {
    const nameLength = axisName.length;
    if (axis[axisProp].substr(0, nameLength) === axisName) {
      const num = parseInt(axis[axisProp].substr(nameLength), RADIX);
      if (num >= value) {
        value = num + 1;
      }
    }
    return value;
  };
}

export { makeSerie, isAxisHorizontal, countNextAxisNumber };
