/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod';

export const indexPatternSchema = z.string().min(1).meta({
  id: 'kbn-index-pattern-schema',
  title: 'Index pattern',
  description:
    'The index pattern (Elasticsearch index expression) to use as the data source. Example: "my-index-*".',
});

export const timeFieldSchema = z.string().optional().meta({
  id: 'kbn-time-field-schema',
  title: 'Time field',
  description:
    'The name of the time field in the index. Used for time-based filtering. Example: "@timestamp".',
});

export const fieldSettingsFieldNameSchema = z.string().min(1).meta({
  id: 'kbn-field-settings-field-name-schema',
  title: 'Field name',
  description:
    'Field name this entry applies to. Use a field from the backing indices for display overrides, or the runtime field name when the entry defines a runtime field. Example: "user.name".',
});

export const allowHiddenIndicesSchema = z.boolean().optional().meta({
  title: 'Allow hidden and system indices',
  description: 'When `true`, allows the data view to match hidden indices.',
});

export const nameSchema = z.string().min(1).max(256).optional().meta({
  title: 'Data view name',
  description: 'The name of the data view. Example: "Sample data view".',
});

export const fieldFiltersSchema = z.array(z.string().min(1).max(1000)).max(10_000).optional().meta({
  id: 'kbn-field-filters-schema',
  title: 'Field filters',
  description:
    "Field filters can be used to exclude one or more fields when fetching a document. They may contain wildcards, such as `user*` which filters fields starting with 'user'.",
});
