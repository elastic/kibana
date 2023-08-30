/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  ContentManagementCrudTypes,
  SavedObjectCreateOptions,
  SavedObjectUpdateOptions,
} from '@kbn/content-management-utils';

import { VisualizationContentType } from '../types';

export type VisualizationCrudTypes = ContentManagementCrudTypes<
  VisualizationContentType,
  VisualizationSavedObjectAttributes,
  Pick<SavedObjectCreateOptions, 'overwrite' | 'references'>,
  Pick<SavedObjectUpdateOptions, 'overwrite' | 'references'>,
  VisualizationSearchQuery
>;

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type VisualizationSavedObjectAttributes = {
  title: string;
  description?: string;
  kibanaSavedObjectMeta?: {
    searchSourceJSON?: string;
  };
  version?: string;
  visState?: string;
  uiStateJSON?: string;
  savedSearchRefName?: string;
};

export type VisualizationSavedObject = VisualizationCrudTypes['Item'];

export type PartialVisualizationSavedObject = VisualizationCrudTypes['PartialItem'];

export interface VisualizationSearchQuery {
  types?: string[];
  searchFields?: string[];
}
