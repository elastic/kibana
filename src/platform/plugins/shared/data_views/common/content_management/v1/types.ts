/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  ContentManagementCrudTypes,
  SavedObjectCreateOptions,
  SavedObjectSearchOptions,
  SavedObjectUpdateOptions,
} from '@kbn/content-management-utils';
import { DataViewAttributes } from '../../types';
import { DataViewContentType } from './constants';

interface DataViewCreateOptions {
  id?: SavedObjectCreateOptions['id'];
  initialNamespaces?: SavedObjectCreateOptions['initialNamespaces'];
  overwrite?: SavedObjectCreateOptions['overwrite'];
}

interface DataViewUpdateOptions {
  version?: SavedObjectUpdateOptions['version'];
  refresh?: SavedObjectUpdateOptions['refresh'];
  retryOnConflict?: SavedObjectUpdateOptions['retryOnConflict'];
}

interface DataViewSearchOptions {
  searchFields?: SavedObjectSearchOptions['searchFields'];
  fields?: SavedObjectSearchOptions['fields'];
}

export type DataViewCrudTypes = ContentManagementCrudTypes<
  DataViewContentType,
  DataViewAttributes,
  DataViewCreateOptions,
  DataViewUpdateOptions,
  DataViewSearchOptions
>;
