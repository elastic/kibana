/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import * as t from 'io-ts';

export const Payload = t.tuple([t.string, t.unknown]);

export const Calls = {
  get: () => ({
    i: t.string,
    o: t.number,
  }),
};

export interface FN<I, O> {
  i: t.Type<I>;
  o: t.Type<O>;
}

export type NamedFnDef<I, O> = () => FN<I, O>;

export type AsyncFN<I, O> = (i: I) => Promise<O>;
