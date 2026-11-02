/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// Core layer exports
export {
  ContentManagementTagsKibanaProvider,
  ContentManagementTagsProvider,
  useServices as useTagServices,
} from './services';

export type {
  ContentManagementTagsKibanaDependencies,
  ContentManagementTagsServices,
} from './services';

export { useTags } from './tags_query';
export type { UseTagsParams, UseTagsReturn } from './tags_query';

export { TagList, TagBadge, TagListComponent } from './components';
export type { TagListProps, TagBadgeProps, TagListComponentProps } from './components';

export type { Tag, ParsedQuery } from './types';
