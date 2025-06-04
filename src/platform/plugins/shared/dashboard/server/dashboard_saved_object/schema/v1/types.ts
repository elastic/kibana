/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { TypeOf } from '@kbn/config-schema';
import { dashboardAttributesSchema } from './v1';

import { DASHBOARD_SAVED_OBJECT_TYPE } from '../../dashboard_saved_object';
import { ContentManagementCrudTypes, SavedObjectCreateOptions, SavedObjectUpdateOptions } from '@kbn/content-management-utils';

export type DashboardContentType = typeof DASHBOARD_SAVED_OBJECT_TYPE;

export type DashboardAttributes = TypeOf<typeof dashboardAttributesSchema>;

export type DashboardSavedObjectCrudTypes = ContentManagementCrudTypes<
  DashboardContentType,
  DashboardAttributes,
  Pick<SavedObjectCreateOptions, 'id' | 'references' | 'overwrite'>,
  Pick<SavedObjectUpdateOptions, 'references'>,
  {
    /** Flag to indicate to only search the text on the "title" field */
    onlyTitle?: boolean;
  }
>;

export type DashboardItem = DashboardSavedObjectCrudTypes['Item'];
