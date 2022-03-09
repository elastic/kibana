/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as t from 'io-ts';

export const pitId = t.string;
export const pit = t.exact(
  t.type({
    id: pitId,
    keepAlive: t.union([t.string, t.undefined]),
  })
);
export const pitOrUndefined = t.union([pit, t.undefined]);

export type Pit = t.TypeOf<typeof pit>;
export type PitId = t.TypeOf<typeof pitId>;
export type PitOrUndefined = t.TypeOf<typeof pitOrUndefined>;
