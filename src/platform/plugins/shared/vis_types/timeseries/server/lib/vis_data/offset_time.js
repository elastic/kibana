/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getTimerange } from './helpers/get_timerange';

export function offsetTime(req, by) {
  const { from, to } = getTimerange(req);
  if (!/^[+-]?([\d]+)([shmdwMy]|ms)$/.test(by)) return { from, to };
  const matches = by.match(/^([+-]?[\d]+)([shmdwMy]|ms)$/);
  const offsetValue = Number(matches[1]);
  const offsetUnit = matches[2];
  return {
    from: from.clone().subtract(offsetValue, offsetUnit),
    to: to.clone().subtract(offsetValue, offsetUnit),
  };
}
