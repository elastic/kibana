/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Boom from '@hapi/boom';
import { pick } from 'lodash';

import type { StorageContext } from '@kbn/content-management-plugin/server';

import type {
  SavedObjectsFindResult,
  SavedObject,
  SavedObjectReference,
} from '@kbn/core-saved-objects-api-server';

import type { ServicesDefinitionSet, SOWithMetadata, SOWithMetadataPartial } from './types';

type PartialSavedObject<T> = Omit<SavedObject<Partial<T>>, 'references'> & {
  references: SavedObjectReference[] | undefined;
};

interface GetMSearchParams {
  savedObjectType: string;
  cmServicesDefinition: ServicesDefinitionSet;
  allowedSavedObjectAttributes: string[];
}

function savedObjectToItem<Attributes extends object>(
  savedObject: SavedObject<Attributes> | PartialSavedObject<Attributes>,
  allowedSavedObjectAttributes: string[]
): SOWithMetadata | SOWithMetadataPartial {
  const {
    id,
    type,
    updated_at: updatedAt,
    created_at: createdAt,
    attributes,
    references,
    error,
    namespaces,
    version,
    managed,
  } = savedObject;

  return {
    id,
    type,
    managed,
    updatedAt,
    createdAt,
    attributes: pick(attributes, allowedSavedObjectAttributes),
    references,
    error,
    namespaces,
    version,
  };
}

export interface GetMSearchType<ReturnItem> {
  savedObjectType: string;
  toItemResult: (ctx: StorageContext, savedObject: SavedObjectsFindResult) => ReturnItem;
}

export const getMSearch = <ReturnItem, SOAttributes extends object>({
  savedObjectType,
  cmServicesDefinition,
  allowedSavedObjectAttributes,
}: GetMSearchParams) => {
  return {
    savedObjectType,
    toItemResult: (ctx: StorageContext, savedObject: SavedObjectsFindResult): ReturnItem => {
      const transforms = ctx.utils.getTransforms(cmServicesDefinition);

      // Validate DB response and DOWN transform to the request version
      const { value, error: resultError } = transforms.mSearch.out.result.down<
        ReturnItem,
        ReturnItem
      >(
        // Ran into a case where a schema was broken by a SO attribute that wasn't part of the definition
        // so we specify which attributes are allowed
        savedObjectToItem<SOAttributes>(
          savedObject as SavedObjectsFindResult<SOAttributes>,
          allowedSavedObjectAttributes
        )
      );

      if (resultError) {
        throw Boom.badRequest(`Invalid response. ${resultError.message}`);
      }

      return value;
    },
  };
};
