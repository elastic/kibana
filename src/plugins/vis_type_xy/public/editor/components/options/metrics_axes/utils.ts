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
import { upperFirst } from 'lodash';

import { Position } from '@elastic/charts';

import { VisParams, ValueAxis, SeriesParam, ChartMode, InterpolationMode } from '../../../../types';
import { ChartType } from '../../../../../common/types';

export const makeSerie = (
  id: string,
  label: string,
  defaultValueAxis: ValueAxis['id'],
  lastSerie?: SeriesParam
): SeriesParam => {
  const data = { id, label };
  const defaultSerie = {
    show: true,
    mode: ChartMode.Normal,
    type: ChartType.Line,
    drawLinesBetweenPoints: true,
    showCircles: true,
    interpolate: InterpolationMode.Linear,
    lineWidth: 2,
    valueAxis: defaultValueAxis,
    data,
  };
  return lastSerie ? { ...lastSerie, data } : defaultSerie;
};

export const isAxisHorizontal = (position: Position) =>
  [Position.Top, Position.Bottom].includes(position as any);

const RADIX = 10;

export function countNextAxisNumber(axisName: string, axisProp: 'id' | 'name' = 'id') {
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

const AXIS_PREFIX = 'Axis-';

export const getUpdatedAxisName = (
  axisPosition: ValueAxis['position'],
  valueAxes: VisParams['valueAxes']
) => {
  const axisName = upperFirst(axisPosition) + AXIS_PREFIX;
  const nextAxisNameNumber = valueAxes.reduce(countNextAxisNumber(axisName, 'name'), 1);

  return `${axisName}${nextAxisNameNumber}`;
};

/**
 * Maps axis position to opposite position
 * @param position
 */
export function mapPositionOpposite(position: Position) {
  switch (position) {
    case Position.Bottom:
      return Position.Top;
    case Position.Top:
      return Position.Bottom;
    case Position.Left:
      return Position.Right;
    case Position.Right:
      return Position.Left;
    default:
      throw new Error('Invalid legend position.');
  }
}

/**
 * Maps axis position to new position or opposite of new position based on old position
 * @param position
 * @param oldPosition
 * @param newPosition
 */
export function mapPositionOpposingOpposite(
  position: Position,
  oldPosition: Position,
  newPosition: Position
) {
  if (position === oldPosition) {
    return newPosition;
  }

  return mapPositionOpposite(newPosition);
}

/**
 * Maps axis position to opposite rotation position
 * @param position
 */
export function mapPosition(position: Position) {
  switch (position) {
    case Position.Bottom:
      return Position.Left;
    case Position.Top:
      return Position.Right;
    case Position.Left:
      return Position.Bottom;
    case Position.Right:
      return Position.Top;
  }
}
