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
import { INTERVAL_STRING_RE } from '../../../../common/interval_regexp';
import { sortBy, isNumber } from 'lodash';

export const ASCENDING_UNIT_ORDER = ['ms', 's', 'm', 'h', 'd', 'w', 'M', 'y'];

const units = {
  ms: 0.001,
  s: 1,
  m: 60,
  h: 3600,
  d: 86400,
  w: 86400 * 7, // Hum... might be wrong
  M: 86400 * 7 * 4, // this too... 29,30,31?
  y: 86400 * 7 * 4 * 12, // Leap year?
};

const sortedUnits = sortBy(Object.keys(units), key => units[key]);

export const parseInterval = intervalString => {
  let value;
  let unit;

  if (intervalString) {
    const matches = intervalString.match(INTERVAL_STRING_RE);

    if (matches) {
      value = Number(matches[1]);
      unit = matches[2];
    }
  }

  return { value, unit };
};

export const convertIntervalToUnit = (intervalString, newUnit) => {
  const parsedInterval = parseInterval(intervalString);
  let value;
  let unit;

  if (parsedInterval.value && units[newUnit]) {
    value = Number(
      ((parsedInterval.value * units[parsedInterval.unit]) / units[newUnit]).toFixed(2)
    );
    unit = newUnit;
  }

  return { value, unit };
};

export const getSuitableUnit = intervalInSeconds =>
  sortedUnits.find((key, index, array) => {
    const nextUnit = array[index + 1];
    const isValidInput = isNumber(intervalInSeconds) && intervalInSeconds > 0;
    const isLastItem = index + 1 === array.length;

    return (
      isValidInput &&
      ((intervalInSeconds >= units[key] && intervalInSeconds < units[nextUnit]) || isLastItem)
    );
  });

export const getUnitValue = unit => units[unit];
