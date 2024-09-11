/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as t from 'io-ts';
import { alertOriginSchema, blankOriginSchema } from './origin';
import { investigationNoteSchema } from './investigation_note';
import { investigationItemSchema } from './investigation_item';

const investigationSchema = t.type({
  id: t.string,
  title: t.string,
  createdAt: t.number,
  createdBy: t.string,
  params: t.type({
    timeRange: t.type({ from: t.number, to: t.number }),
  }),
  origin: t.union([alertOriginSchema, blankOriginSchema]),
  status: t.union([t.literal('ongoing'), t.literal('closed')]),
  notes: t.array(investigationNoteSchema),
  items: t.array(investigationItemSchema),
});

export { investigationSchema };
