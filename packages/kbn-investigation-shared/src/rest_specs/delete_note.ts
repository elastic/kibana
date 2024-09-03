/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as t from 'io-ts';

const deleteInvestigationNoteParamsSchema = t.type({
  path: t.type({
    investigationId: t.string,
    noteId: t.string,
  }),
});

type DeleteInvestigationNoteParams = t.TypeOf<
  typeof deleteInvestigationNoteParamsSchema.props.path
>;

export { deleteInvestigationNoteParamsSchema };
export type { DeleteInvestigationNoteParams };
