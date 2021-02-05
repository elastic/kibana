/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { upperFirst } from 'lodash';

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
  [Positions.TOP, Positions.BOTTOM].includes(position as any);

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

const AXIS_PREFIX = 'Axis-';

const getUpdatedAxisName = (
  axisPosition: ValueAxis['position'],
  valueAxes: BasicVislibParams['valueAxes']
) => {
  const axisName = upperFirst(axisPosition) + AXIS_PREFIX;
  const nextAxisNameNumber = valueAxes.reduce(countNextAxisNumber(axisName, 'name'), 1);

  return `${axisName}${nextAxisNameNumber}`;
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
  mapPositionOpposite,
  mapPosition,
};
