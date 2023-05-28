/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type {
  ContentManagementCrudTypes,
  SavedObjectCreateOptions,
  SavedObjectSearchOptions,
  SavedObjectUpdateOptions,
} from '@kbn/content-management-utils';
import { SavedSearchAttributes } from '../../types';
import { SavedSearchContentType } from '../../constants';

interface SavedSearchCreateOptions {
  id?: SavedObjectCreateOptions['id'];
  overwrite?: SavedObjectCreateOptions['overwrite'];
  references?: SavedObjectCreateOptions['references'];
}

interface SavedSearchUpdateOptions {
  references?: SavedObjectUpdateOptions['references'];
}

interface SavedSearchSearchOptions {
  searchFields?: SavedObjectSearchOptions['searchFields'];
  fields?: SavedObjectSearchOptions['fields'];
}

export type SavedSearchCrudTypes = ContentManagementCrudTypes<
  SavedSearchContentType,
  SavedSearchAttributes,
  SavedSearchCreateOptions,
  SavedSearchUpdateOptions,
  SavedSearchSearchOptions
>;
