/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { pick } from 'lodash';

import type { SavedObject, SavedObjectReference } from '@kbn/core-saved-objects-api-server';
import type { DashboardSavedObjectAttributes } from '../../dashboard_saved_object';
import { transformDashboardOut } from './transforms';
import type { DashboardItem, PartialDashboardItem } from './types';

type PartialSavedObject<T> = Omit<SavedObject<Partial<T>>, 'references'> & {
  references: SavedObjectReference[] | undefined;
};

type SavedObjectToItemReturn<T> =
  | {
      item: T;
      error: null;
    }
  | {
      item: null;
      error: Error;
    };

export function savedObjectToItem(
  savedObject:
    | SavedObject<DashboardSavedObjectAttributes>
    | PartialSavedObject<DashboardSavedObjectAttributes>,
  partial: boolean /* partial arg is used to enforce the correct savedObject type */,
  {
    allowedAttributes,
    allowedReferences,
    getTagNamesFromReferences,
  }: {
    /**
     * attributes to include in the output item
     */
    allowedAttributes?: string[];
    /**
     * references to include in the output item
     */
    allowedReferences?: string[];
    getTagNamesFromReferences?: (references: SavedObjectReference[]) => string[];
  } = {}
): SavedObjectToItemReturn<DashboardItem | PartialDashboardItem> {
  const {
    id,
    type,
    updated_at: updatedAt,
    updated_by: updatedBy,
    created_at: createdAt,
    created_by: createdBy,
    attributes,
    error,
    namespaces,
    references,
    version,
    managed,
  } = savedObject;
  try {
    const dashboardState = transformDashboardOut(attributes, references, getTagNamesFromReferences);

    // if includeReferences is provided, only include references of those types
    const referencesOut = allowedReferences
      ? references?.filter((reference) => allowedReferences.includes(reference.type))
      : references;

    const attributesOut = allowedAttributes
      ? pick(dashboardState, allowedAttributes)
      : dashboardState;

    return {
      item: {
        data: {
          ...attributesOut,
          references: referencesOut,
          spaces: namespaces,
        },
        meta: {
          id,
          type,
          updatedAt,
          updatedBy,
          createdAt,
          createdBy,
        },
      },
      error: null,
    };
  } catch (e) {
    return {
      item: {
        data: {},
        meta: {
          id,
          type,
        },
      },
      error: e,
    };
  }
}
