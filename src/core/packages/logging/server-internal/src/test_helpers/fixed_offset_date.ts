/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const RealDate = global.Date;

export const createFixedOffsetDate = (utcMs: number, offsetMinutes: number): Date => {
  const date = new RealDate(utcMs);
  const shifted = () => new RealDate(date.getTime() - offsetMinutes * 60_000);
  Object.defineProperties(date, {
    getTimezoneOffset: { value: () => offsetMinutes },
    getFullYear: { value: () => shifted().getUTCFullYear() },
    getMonth: { value: () => shifted().getUTCMonth() },
    getDate: { value: () => shifted().getUTCDate() },
    getHours: { value: () => shifted().getUTCHours() },
    getMinutes: { value: () => shifted().getUTCMinutes() },
    getSeconds: { value: () => shifted().getUTCSeconds() },
    getMilliseconds: { value: () => shifted().getUTCMilliseconds() },
  });
  return date;
};
