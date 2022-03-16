/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { diffStrings } from '@kbn/dev-utils';
import jsonStable from 'json-stable-stringify';

export function diffCacheKey(expected?: unknown, actual?: unknown) {
  const expectedJson = jsonStable(expected, {
    space: '  ',
  });
  const actualJson = jsonStable(actual, {
    space: '  ',
  });

  if (expectedJson === actualJson) {
    return;
  }

  return diffStrings(expectedJson, actualJson);
}
