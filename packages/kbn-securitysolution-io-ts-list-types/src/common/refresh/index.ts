/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as t from 'io-ts';

export const refresh = t.union([t.literal('true'), t.literal('false')]);
export const refreshWithWaitFor = t.union([
  t.literal('true'),
  t.literal('false'),
  t.literal('wait_for'),
]);
export type Refresh = t.TypeOf<typeof refresh>;
export type RefreshWithWaitFor = t.TypeOf<typeof refreshWithWaitFor>;
