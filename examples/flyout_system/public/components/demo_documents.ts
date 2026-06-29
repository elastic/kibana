/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export interface DocumentItem {
  title: string;
  body: string;
}

export const MOCK_DOCUMENTS: readonly DocumentItem[] = [
  { title: 'Document 1', body: 'This is the content of document 1.' },
  { title: 'Document 2', body: 'This is the content of document 2.' },
  { title: 'Document 3', body: 'This is the content of document 3.' },
  { title: 'Document 4', body: 'This is the content of document 4.' },
  { title: 'Document 5', body: 'This is the content of document 5.' },
  { title: 'Document 6', body: 'This is the content of document 6.' },
];
