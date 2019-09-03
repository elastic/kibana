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

import { capitalize } from 'lodash';

import { BasicVislibParams, ValueAxis, SeriesParam } from '../../../types';
import { ChartModes, ChartTypes, InterpolationModes, Positions } from '../../../utils/collections';

const makeSerie = (
  id: string,
  label: string,
  defaultValueAxis: ValueAxis['id'],
  lastSerie?: SeriesParam
): SeriesParam => {
  const data = { id, label };
  const defaultSerie = {
    show: true,
    mode: ChartModes.NORMAL,
    type: ChartTypes.LINE,
    drawLinesBetweenPoints: true,
    showCircles: true,
    interpolate: InterpolationModes.LINEAR,
    lineWidth: 2,
    valueAxis: defaultValueAxis,
    data,
  };
  return lastSerie ? { ...lastSerie, data } : defaultSerie;
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

export interface AxesNumbers {
  [key: string]: number;
}

const AXIS_PREFIX = 'Axis-';
const VALUE_AXIS_PREFIX = 'ValueAxis-';

const getUpdatedAxisName = (
  axisPosition: ValueAxis['position'],
  axesNumbers: AxesNumbers,
  valueAxes: BasicVislibParams['valueAxes']
) => {
  const axisName = capitalize(axisPosition) + AXIS_PREFIX;
  const lastAxisNameNumber = axesNumbers[axisPosition];
  const nextAxisNameNumber = lastAxisNameNumber
    ? lastAxisNameNumber + 1
    : valueAxes.reduce(countNextAxisNumber(axisName, 'name'), 1);

  return [`${axisName}${nextAxisNameNumber}`, nextAxisNameNumber] as [string, number];
};

const getPreviousAxisNumbers = (axis: ValueAxis, axesNumbers: AxesNumbers) => {
  const lastIdNumber = axesNumbers[VALUE_AXIS_PREFIX];
  const lastNameNumber = axesNumbers[axis.position];
  const updatedNumbers: AxesNumbers = { ...axesNumbers };
  let isChanged = false;

  if (axis.id.endsWith(`-${lastIdNumber}`)) {
    delete updatedNumbers[VALUE_AXIS_PREFIX];
    isChanged = true;
  }
  if (axis.name.endsWith(`-${lastNameNumber}`)) {
    delete updatedNumbers[axis.position];
    isChanged = true;
  }

  return isChanged ? updatedNumbers : null;
};

function mapPositionOpposite(position: Positions) {
  switch (position) {
    case Positions.BOTTOM:
      return Positions.TOP;
    case Positions.TOP:
      return Positions.BOTTOM;
    case Positions.LEFT:
      return Positions.RIGHT;
    case Positions.RIGHT:
      return Positions.LEFT;
    default:
      throw new Error('Invalid legend position.');
  }
}

function mapPosition(position: Positions) {
  switch (position) {
    case Positions.BOTTOM:
      return Positions.LEFT;
    case Positions.TOP:
      return Positions.RIGHT;
    case Positions.LEFT:
      return Positions.BOTTOM;
    case Positions.RIGHT:
      return Positions.TOP;
  }
}

export {
  makeSerie,
  isAxisHorizontal,
  countNextAxisNumber,
  getUpdatedAxisName,
  getPreviousAxisNumbers,
  mapPositionOpposite,
  mapPosition,
  AXIS_PREFIX,
  RADIX,
};
