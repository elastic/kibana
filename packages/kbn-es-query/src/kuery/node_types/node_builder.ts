/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { functions } from '../functions';

export const nodeBuilder = {
  and: functions.and.buildNode,
  exists: functions.exists.buildNode,
  is: functions.is.buildNode,
  nested: functions.nested.buildNode,
  not: functions.not.buildNode,
  or: functions.or.buildNode,
  range: functions.range.buildNode,
};
