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
  seriesParams: SeriesParam[],
  defaultValueAxis: ValueAxis['id']
): SeriesParam => {
  const last = seriesParams[seriesParams.length - 1];
  return {
    show: true,
    mode: last ? last.mode : ChartModes.NORMAL,
    type: last ? last.type : ChartTypes.LINE,
    drawLinesBetweenPoints: last ? last.drawLinesBetweenPoints : true,
    showCircles: last ? last.showCircles : true,
    interpolate: last ? last.interpolate : InterpolationModes.LINEAR,
    lineWidth: last ? last.lineWidth : 2,
    data: {
      id,
      label,
    },
    valueAxis: last ? last.valueAxis : defaultValueAxis,
  };
};

const isAxisHorizontal = (position: Positions) =>
  [Positions.TOP, Positions.BOTTOM].includes(position);

const RADIX = 10;

function countNextAxisNumber(axisName: string) {
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

export { makeSerie, isAxisHorizontal, countNextAxisNumber };
