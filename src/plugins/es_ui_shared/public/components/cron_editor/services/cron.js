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

export const MINUTE = 'MINUTE';
export const HOUR = 'HOUR';
export const DAY = 'DAY';
export const WEEK = 'WEEK';
export const MONTH = 'MONTH';
export const YEAR = 'YEAR';

export function cronExpressionToParts(expression) {
  const parsedCron = {
    second: undefined,
    minute: undefined,
    hour: undefined,
    day: undefined,
    date: undefined,
    month: undefined,
  };

  const parts = expression.split(' ');

  if (parts.length >= 1) {
    parsedCron.second = parts[0];
  }

  if (parts.length >= 2) {
    parsedCron.minute = parts[1];
  }

  if (parts.length >= 3) {
    parsedCron.hour = parts[2];
  }

  if (parts.length >= 4) {
    parsedCron.date = parts[3];
  }

  if (parts.length >= 5) {
    parsedCron.month = parts[4];
  }

  if (parts.length >= 6) {
    parsedCron.day = parts[5];
  }

  return parsedCron;
}

export function cronPartsToExpression({ second, minute, hour, day, date, month }) {
  return `${second} ${minute} ${hour} ${date} ${month} ${day}`;
}
