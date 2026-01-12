/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { TypeOf } from '@kbn/config-schema';
import type { Writable } from '@kbn/utility-types';
import type { markdownByValueEmbeddableSchema } from './schemas';

export {
  type MarkdownByReferenceState,
  type MarkdownByValueState,
  markdownEmbeddableSchema,
  type MarkdownEmbeddableState,
} from './schemas';

export type {
  MarkdownCreateRequestBody,
  MarkdownCreateResponseBody,
  MarkdownReadResponseBody,
  MarkdownUpdateResponseBody,
} from './api';

export type MarkdownState = Writable<TypeOf<typeof markdownByValueEmbeddableSchema>>;
export type StoredMarkdownState = TypeOf<typeof markdownByValueEmbeddableSchema>;

export const plugin = async () => {
  const { MarkdownPlugin } = await import('./plugin');
  return new MarkdownPlugin();
};
