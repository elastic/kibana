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

const investigationItemsSchema = esqlItemSchema; // replace with union with various item types

const investigationItemSchema = t.intersection([
  t.type({ id: t.string, createdAt: t.number, createdBy: t.string }),
  investigationItemsSchema,
]);

export { investigationItemSchema, investigationItemsSchema, esqlItemSchema };
