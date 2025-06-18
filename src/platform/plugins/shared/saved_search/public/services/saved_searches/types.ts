/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Reference } from '@kbn/content-management-utils';
import type { SavedObjectsResolveResponse } from '@kbn/core-saved-objects-api-server';
import type { SavedSearch as SavedSearchCommon, SavedSearchAttributes } from '../../../common';

/** @public **/
export interface SavedSearch extends SavedSearchCommon {
  sharingSavedObjectProps?: {
    outcome?: SavedObjectsResolveResponse['outcome'];
    aliasTargetId?: SavedObjectsResolveResponse['alias_target_id'];
    aliasPurpose?: SavedObjectsResolveResponse['alias_purpose'];
    errorJSON?: string;
  };
}

export type SavedSearchByValueAttributes = Omit<SavedSearchAttributes, 'description'> & {
  description?: string;
  references: Reference[];
};
