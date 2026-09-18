/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export interface DocumentSelection {
  _id: string;
  _index: string;
}

/**
 * A document trigger selection sent as compact `(id, index)` pairs. The server expands each pair
 * into the same `{ _id, _index, ...source }` shape a caller would otherwise embed itself, so a
 * request stays small regardless of how many documents are selected.
 */
export interface DocumentTriggerInput {
  event: {
    triggerType: 'document';
    documentIds: DocumentSelection[];
  };
}

/** An expanded document as it appears in `event.documents` once preprocessing has run. */
export type ExpandedDocument = DocumentSelection & Record<string, unknown>;
