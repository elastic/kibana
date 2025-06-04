/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Serializable } from '@kbn/utility-types';
import { TypeOf } from '@kbn/config-schema';
import {
  ContentManagementCrudTypes,
  SavedObjectCreateOptions,
  SavedObjectUpdateOptions,
} from '@kbn/content-management-utils';
import {
  controlGroupInputSchema,
  dashboardAttributesSchema,
  gridDataSchema,
  sectionSchema,
} from './v2';
import { DashboardContentType } from '../v1/types';

export type DashboardAttributes = TypeOf<typeof dashboardAttributesSchema>;
export type GridData = TypeOf<typeof gridDataSchema>;

/**
 * A saved dashboard panel parsed directly from the Dashboard Attributes panels JSON
 */
export interface SavedDashboardPanel {
  embeddableConfig: { [key: string]: Serializable }; // parsed into the panel's explicitInput
  id?: string; // the saved object id for by reference panels
  type: string; // the embeddable type
  panelRefName?: string;
  gridData: GridData;
  panelIndex: string;
  title?: string;

  /**
   * This version key was used to store Kibana version information from versions 7.3.0 -> 8.11.0.
   * As of version 8.11.0, the versioning information is now per-embeddable-type and is stored on the
   * embeddable's input. (embeddableConfig in this type).
   */
  version?: string;
}

/**
 * A saved dashboard section parsed directly from the Dashboard Attributes
 */
export type SavedDashboardSection = TypeOf<typeof sectionSchema>;

export type DashboardSavedObjectControlGroupInput = TypeOf<typeof controlGroupInputSchema>;

export type DashboardSavedObjectCrudTypes = ContentManagementCrudTypes<
  DashboardContentType,
  DashboardAttributes,
  Pick<SavedObjectCreateOptions, 'id' | 'references' | 'overwrite'>,
  Pick<SavedObjectUpdateOptions, 'references' | 'mergeAttributes'>,
  {
    /** Flag to indicate to only search the text on the "title" field */
    onlyTitle?: boolean;
  }
>;
