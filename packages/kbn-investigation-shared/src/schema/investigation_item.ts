/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as t from 'io-ts';

const itemSchema = t.type({
  title: t.string,
  type: t.string,
  params: t.record(t.string, t.any),
});

const investigationItemSchema = t.intersection([
  t.type({
    id: t.string,
    createdAt: t.number,
    createdBy: t.string,
  }),
  itemSchema,
]);

type Item = t.TypeOf<typeof itemSchema>;
type InvestigationItem = t.TypeOf<typeof investigationItemSchema>;

export type { Item, InvestigationItem };
export { investigationItemSchema, itemSchema };
