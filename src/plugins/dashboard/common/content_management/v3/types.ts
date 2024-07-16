/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { TypeOf } from '@kbn/config-schema';
import {
  CMCrudTypes,
  ContentManagementCrudTypes,
  SavedObjectCreateOptions,
  SavedObjectUpdateOptions,
} from '@kbn/content-management-utils';
import { PersistableControlGroupInput } from '@kbn/controls-plugin/common';
import { DashboardContentType } from '../types';
import { DashboardAttributes as DashboardAttributesV2 } from '../v2';
import { dashboardAttributesSchema } from './cm_services';

export type { PersistableControlGroupInput as ControlGroupAttributes };

export type { DashboardAttributesV2 as RawDashboardAttributes };

export type DashboardAttributes = TypeOf<typeof dashboardAttributesSchema>;

export type DashboardCrudTypes = CMCrudTypes &
  ContentManagementCrudTypes<
    DashboardContentType,
    DashboardAttributes,
    Pick<SavedObjectCreateOptions, 'id' | 'references' | 'overwrite'>,
    Pick<SavedObjectUpdateOptions, 'references' | 'mergeAttributes'>,
    {
      /** Flag to indicate to only search the text on the "title" field */
      onlyTitle?: boolean;
    }
  >;
