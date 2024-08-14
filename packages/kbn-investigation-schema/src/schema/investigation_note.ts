/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as t from 'io-ts';

const investigationNoteResponseSchema = t.type({
  id: t.string,
  content: t.string,
  createdAt: t.number,
  createdBy: t.string,
});

type InvestigationNoteResponse = t.OutputOf<typeof investigationNoteResponseSchema>;

export { investigationNoteResponseSchema };
export type { InvestigationNoteResponse };
