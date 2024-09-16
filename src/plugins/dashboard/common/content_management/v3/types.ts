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
  SavedObjectUpdateOptions,
} from '@kbn/content-management-utils';
import type { DashboardAttributes } from '../../../server/content_management/schema/v3';
import type { DashboardSavedObjectAttributes } from '../../../server/dashboard_saved_object';
import type { DashboardContentType } from '../types';

export type DashboardCrudTypes = ContentManagementCrudTypes<
  DashboardContentType,
  DashboardSavedObjectAttributes,
  Pick<SavedObjectCreateOptions, 'id' | 'references' | 'overwrite'>,
  Pick<SavedObjectUpdateOptions, 'references' | 'mergeAttributes'>,
  {
    /** Flag to indicate to only search the text on the "title" field */
    onlyTitle?: boolean;
  },
  DashboardAttributes
>;

export type DashboardItem = DashboardCrudTypes['Item'];
