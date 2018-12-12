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

import moment from 'moment';

const unitsMap = {
  ms: { weight: 1, type: 'fixed', base: 1 },
  s: { weight: 2, type: 'fixed', base: 1000 },
  m: { weight: 3, type: 'mixed', base: 1000 * 60 },
  h: { weight: 4, type: 'mixed', base: 1000 * 60 * 60 },
  d: { weight: 5, type: 'mixed', base: 1000 * 60 * 60 * 24 },
  w: { weight: 6, type: 'calendar', base: NaN },
  M: { weight: 7, type: 'calendar', base: NaN },
  // q: { weight: 8, type: 'calendar' }, // TODO: moment duration does not support quarter
  y: { weight: 9, type: 'calendar', base: NaN },
};
const units = Object.keys(unitsMap).sort((a, b) => unitsMap[b].weight - unitsMap[a].weight);
const unitsDesc = [...units];
const unitsAsc = [...units].reverse();

const isDate = d => Object.prototype.toString.call(d) === '[object Date]';

const isValidDate = d => isDate(d) && !isNaN(d.valueOf());

/*
 * This is a simplified version of elasticsearch's date parser.
 * If you pass in a momentjs instance as the third parameter the calculation
 * will be done using this (and its locale settings) instead of the one bundled
 * with this library.
 */
function parse(text, { roundUp = false, momentInstance = moment, forceNow } = {}) {
  if (!text) return undefined;
  if (momentInstance.isMoment(text)) return text;
  if (isDate(text)) return momentInstance(text);
  if (forceNow !== undefined && !isValidDate(forceNow)) {
    throw new Error('forceNow must be a valid Date');
  }

  let time;
  let mathString = '';
  let index;
  let parseString;

  if (text.substring(0, 3) === 'now') {
    time = momentInstance(forceNow);
    mathString = text.substring('now'.length);
  } else {
    index = text.indexOf('||');
    if (index === -1) {
      parseString = text;
      mathString = ''; // nothing else
    } else {
      parseString = text.substring(0, index);
      mathString = text.substring(index + 2);
    }
    // We're going to just require ISO8601 timestamps, k?
    time = momentInstance(parseString);
  }

  if (!mathString.length) {
    return time;
  }

  return parseDateMath(mathString, time, roundUp);
}

function parseDateMath(mathString, time, roundUp) {
  const dateTime = time;
  const len = mathString.length;
  let i = 0;

  while (i < len) {
    const c = mathString.charAt(i++);
    let type;
    let num;
    let unit;

    if (c === '/') {
      type = 0;
    } else if (c === '+') {
      type = 1;
    } else if (c === '-') {
      type = 2;
    } else {
      return;
    }

    if (isNaN(mathString.charAt(i))) {
      num = 1;
    } else if (mathString.length === 2) {
      num = mathString.charAt(i);
    } else {
      const numFrom = i;
      while (!isNaN(mathString.charAt(i))) {
        i++;
        if (i >= len) return;
      }
      num = parseInt(mathString.substring(numFrom, i), 10);
    }

    if (type === 0) {
      // rounding is only allowed on whole, single, units (eg M or 1M, not 0.5M or 2M)
      if (num !== 1) {
        return;
      }
    }

    unit = mathString.charAt(i++);

    // append additional characters in the unit
    for (let j = i; j < len; j++) {
      const unitChar = mathString.charAt(i);
      if (/[a-z]/i.test(unitChar)) {
        unit += unitChar;
        i++;
      } else {
        break;
      }
    }

    if (units.indexOf(unit) === -1) {
      return;
    } else {
      if (type === 0) {
        if (roundUp) dateTime.endOf(unit);
        else dateTime.startOf(unit);
      } else if (type === 1) {
        dateTime.add(num, unit);
      } else if (type === 2) {
        dateTime.subtract(num, unit);
      }
    }
  }

  return dateTime;
}

export default {
  parse: parse,
  unitsMap: Object.freeze(unitsMap),
  units: Object.freeze(units),
  unitsAsc: Object.freeze(unitsAsc),
  unitsDesc: Object.freeze(unitsDesc),
};
