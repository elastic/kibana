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
import { NavigationEmbeddableContentType } from '../../types';

export type NavigationEmbeddableCrudTypes = ContentManagementCrudTypes<
  NavigationEmbeddableContentType,
  NavigationEmbeddableAttributes,
  Pick<SavedObjectCreateOptions, 'references'>,
  Pick<SavedObjectUpdateOptions, 'references'>,
  {
    /** Flag to indicate to only search the text on the "title" field */
    onlyTitle?: boolean;
  }
>;

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type NavigationEmbeddableAttributes = {
  title: string;
  description?: string;
  linksJSON?: string;
};
