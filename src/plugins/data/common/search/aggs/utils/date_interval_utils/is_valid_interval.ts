/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { isValidEsInterval } from './is_valid_es_interval';
import { leastCommonInterval } from './least_common_interval';

// When base interval is set, check for least common interval and allow
// input the value is the same. This means that the input interval is a
// multiple of the base interval.
function parseWithBase(value: string, baseInterval: string) {
  try {
    const interval = leastCommonInterval(baseInterval, value);
    return interval === value.replace(/\s/g, '');
  } catch (e) {
    return false;
  }
}

export function isValidInterval(value: string, baseInterval?: string) {
  if (baseInterval) {
    return parseWithBase(value, baseInterval);
  } else {
    return isValidEsInterval(value);
  }
}
