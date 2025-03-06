/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Boom from '@hapi/boom';
import { isSupportedEsServer } from '@kbn/core-elasticsearch-server-internal';
import { SavedObjectsErrorHelpers } from '@kbn/core-saved-objects-server';
import { DEFAULT_NAMESPACE_STRING } from '@kbn/core-saved-objects-utils-server';
import {
  SavedObjectsOpenPointInTimeOptions,
  SavedObjectsFindInternalOptions,
  SavedObjectsOpenPointInTimeResponse,
} from '@kbn/core-saved-objects-api-server';
import { ApiExecutionContext } from './types';

export interface PerforOpenPointInTimeParams {
  type: string | string[];
  options: SavedObjectsOpenPointInTimeOptions;
  internalOptions: SavedObjectsFindInternalOptions;
}

export const performOpenPointInTime = async <T>(
  { type, options, internalOptions }: PerforOpenPointInTimeParams,
  { helpers, allowedTypes: rawAllowedTypes, client, extensions = {} }: ApiExecutionContext
): Promise<SavedObjectsOpenPointInTimeResponse> => {
  const { common: commonHelper } = helpers;
  const { securityExtension, spacesExtension } = extensions;
  const { disableExtensions } = internalOptions;
  let namespaces!: string[];
  if (disableExtensions || !spacesExtension) {
    namespaces = options.namespaces ?? [DEFAULT_NAMESPACE_STRING];
    // If the consumer specified `namespaces: []`, throw a Bad Request error
    if (namespaces.length === 0)
      throw SavedObjectsErrorHelpers.createBadRequestError(
        'options.namespaces cannot be an empty array'
      );
  }

  const { keepAlive = '5m', preference } = options;
  const types = Array.isArray(type) ? type : [type];
  const allowedTypes = types.filter((t) => rawAllowedTypes.includes(t));
  if (allowedTypes.length === 0) {
    throw SavedObjectsErrorHelpers.createGenericNotFoundError();
  }

  if (!disableExtensions && spacesExtension) {
    try {
      namespaces = await spacesExtension.getSearchableNamespaces(options.namespaces);
    } catch (err) {
      if (Boom.isBoom(err) && err.output.payload.statusCode === 403) {
        // The user is not authorized to access any space, throw a bad request error.
        throw SavedObjectsErrorHelpers.createBadRequestError();
      }
      throw err;
    }
    if (namespaces.length === 0) {
      // The user is authorized to access *at least one space*, but not any of the spaces they requested; throw a bad request error.
      throw SavedObjectsErrorHelpers.createBadRequestError();
    }
  }

  if (!disableExtensions && securityExtension) {
    await securityExtension.authorizeOpenPointInTime({
      namespaces: new Set(namespaces),
      types: new Set(types),
    });
  }

  const esOptions = {
    index: commonHelper.getIndicesForTypes(allowedTypes),
    keep_alive: keepAlive,
    ...(preference ? { preference } : {}),
  };

  const { body, statusCode, headers } = await client.openPointInTime(esOptions, {
    ignore: [404],
    meta: true,
  });

  if (statusCode === 404) {
    if (!isSupportedEsServer(headers)) {
      throw SavedObjectsErrorHelpers.createGenericNotFoundEsUnavailableError();
    } else {
      throw SavedObjectsErrorHelpers.createGenericNotFoundError();
    }
  }

  return {
    id: body.id,
  };
};
