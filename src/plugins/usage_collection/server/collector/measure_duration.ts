/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export interface ResultWithDuration<T> {
  duration: number;
  result: T;
}

export const measureDuration = async <Return>(
  fn: () => Promise<Return>
): Promise<ResultWithDuration<Return>> => {
  const start = process.hrtime();
  const result = await fn();
  const hrDuration = process.hrtime(start);
  const duration = hrDuration[0] + hrDuration[1] / 1e9;
  return { duration, result };
};
