/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

<<<<<<<< HEAD:src/platform/plugins/shared/dashboard_markdown/public/markdown_client/has_library_item_with_title.ts
import { markdownClient } from './markdown_client';

export const hasLibraryItemWithTitle = async (title: string) => {
  const { data: markdowns } = await markdownClient.search({
    query: `"${title}"`,
  });

  return markdowns.some((markdown) => markdown.data.title.toLowerCase() === title.toLowerCase());
};
========
import { schema } from '@kbn/config-schema';
import { markdownAttributesSchema } from '../markdown_saved_object';
import { markdownByValueStateSchema } from '../embeddable/schemas';

export const markdownLibraryItemSchema = schema.object({
  ...markdownAttributesSchema.getPropSchemas(),
  ...markdownByValueStateSchema.getPropSchemas(),
});
>>>>>>>> 9.4:src/platform/plugins/shared/dashboard_markdown/server/api/schema.ts
