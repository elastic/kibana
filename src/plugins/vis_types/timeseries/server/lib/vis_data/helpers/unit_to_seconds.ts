/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { sortBy, isNumber } from 'lodash';
import { Unit } from '@kbn/datemath';

/** @ts-ignore */
import { INTERVAL_STRING_RE } from '../../../../common/interval_regexp';

export const ASCENDING_UNIT_ORDER: Unit[] = ['ms', 's', 'm', 'h', 'd', 'w', 'M', 'y'];

const units: Record<Unit, number> = {
  ms: 0.001,
  s: 1,
  m: 60,
  h: 3600,
  d: 86400,
  w: 86400 * 7, // Hum... might be wrong
  M: 86400 * 7 * 4, // this too... 29,30,31?
  y: 86400 * 7 * 4 * 12, // Leap year?
};

const sortedUnits = sortBy(Object.keys(units), (key: Unit) => units[key]);

export interface ParsedInterval {
  value: number;
  unit: Unit;
}

export const parseInterval = (intervalString: string): ParsedInterval | undefined => {
  if (intervalString) {
    const matches = intervalString.match(INTERVAL_STRING_RE);

    if (matches) {
      return {
        value: Number(matches[1]),
        unit: matches[2] as Unit,
      };
    }
  }
};

export const convertIntervalToUnit = (
  intervalString: string,
  newUnit: Unit
): ParsedInterval | undefined => {
  const parsedInterval = parseInterval(intervalString);

  if (parsedInterval && units[newUnit]) {
    return {
      value: Number(
        ((parsedInterval.value * units[parsedInterval.unit!]) / units[newUnit]).toFixed(2)
      ),
      unit: newUnit,
    };
  }
};

export const getSuitableUnit = (intervalInSeconds: string | number) =>
  sortedUnits.find((key, index, array) => {
    const nextUnit = array[index + 1] as Unit;
    const isValidInput = isNumber(intervalInSeconds) && intervalInSeconds > 0;
    const isLastItem = index + 1 === array.length;

    return (
      isValidInput &&
      ((intervalInSeconds >= units[key as Unit] && intervalInSeconds < units[nextUnit]) ||
        isLastItem)
    );
  }) as Unit;

export const getUnitValue = (unit: Unit) => units[unit];
