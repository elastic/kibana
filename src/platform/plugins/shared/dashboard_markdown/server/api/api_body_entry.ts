/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ApiBodyEntry } from '@kbn/saved-objects-management-plugin/server';
import type { StoredMarkdownState } from '../markdown_saved_object';
import { updateRequestBodySchema } from './update/schemas';
import type { MarkdownUpdateRequestBody } from './update/types';

/** The `markdown` entry for Saved Objects Management's API body registry. */
export const markdownApiBodyEntry: ApiBodyEntry<MarkdownUpdateRequestBody, StoredMarkdownState> = {
  getSchema: () => updateRequestBodySchema,
  // Markdown library items are stored in their API shape and point to nothing.
  toApi: ({ attributes }) => ({ body: attributes, warnings: [] }),
  toStored: (body) => ({ attributes: body, references: [] }),
};
