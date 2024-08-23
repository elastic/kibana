/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as t from 'io-ts';

const esqlItemSchema = t.type({
  title: t.string,
  type: t.literal('esql'),
  params: t.type({
    esql: t.string,
    suggestion: t.any,
  }),
});

const embeddableItemSchema = t.type({
  title: t.string,
  type: t.literal('embeddable'),
  params: t.type({
    type: t.string,
    savedObjectId: t.union([t.string, t.undefined]),
    config: t.record(t.string, t.any),
  }),
});

const investigationItemsSchema = t.union([esqlItemSchema, embeddableItemSchema]); // replace with union with various item types
const investigationItemTypeSchema = t.union([t.literal('esql'), t.literal('embeddable')]);

const investigationItemSchema = t.intersection([
  t.type({ id: t.string, createdAt: t.number, createdBy: t.string }),
  investigationItemsSchema,
]);

type EsqlItem = t.TypeOf<typeof esqlItemSchema>;
type EmbeddableItem = t.TypeOf<typeof embeddableItemSchema>;
type InvestigationItems = t.TypeOf<typeof investigationItemsSchema>;
type InvestigationItemType = t.TypeOf<typeof investigationItemTypeSchema>;

type InvestigationItem = t.TypeOf<typeof investigationItemSchema>;

export type {
  InvestigationItem,
  InvestigationItems,
  InvestigationItemType,
  EsqlItem,
  EmbeddableItem,
};
export { investigationItemSchema, investigationItemsSchema, esqlItemSchema, embeddableItemSchema };
