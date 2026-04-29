/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ContentManagementPlugin } from './plugin';
export type { CrudClient } from './crud_client';
export {
  ContentClientProvider,
  ContentClient,
  useCreateContentMutation,
  useUpdateContentMutation,
  useDeleteContentMutation,
  useSearchContentQuery,
  useGetContentQuery,
  useContentClient,
  type QueryOptions,
} from './content_client';

export function plugin() {
  return new ContentManagementPlugin();
}

export type { ContentManagementPublicStart, ContentManagementPublicSetup } from './types';
