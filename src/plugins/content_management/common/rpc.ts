/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import * as t from 'io-ts';

export const Payload = t.strict({
  fn: t.string,
  arg: t.unknown,
});

const ref = t.type({
  $id: t.string,
});

export const kibanaContent = t.intersection([
  t.type({
    id: t.string,
    title: t.string,
    type: t.string,
    meta: t.type({
      updatedAt: t.string,
      createdAt: t.string,
      updatedBy: ref,
      createdBy: ref,
    }),
  }),
  t.partial({
    description: t.string,
  }),
]);

export const Calls = {
  get: () => ({
    i: t.type({
      type: t.string, // content type
      id: t.string, // content ID
    }),
    o: kibanaContent,
  }),
  create: () => ({
    i: t.type({
      type: t.string, // content type
      data: t.intersection([
        t.type({
          title: t.string,
        }),
        t.partial({
          description: t.string,
        }),
      ]),
    }),
    o: kibanaContent,
  }),
};

export interface FN<I, O> {
  i: t.Type<I>;
  o: t.Type<O>;
}

export type NamedFnDef<I, O> = () => FN<I, O>;

export type AsyncFN<I, O> = (i: I) => Promise<O>;
