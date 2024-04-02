/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  SavedObjectsErrorHelpers,
  type SavedObject,
  type SavedObjectSanitizedDoc,
  SavedObjectsRawDocSource,
} from '@kbn/core-saved-objects-server';
import { encodeHitVersion } from '@kbn/core-saved-objects-base-server-internal';
import {
  SavedObjectsIncrementCounterOptions,
  SavedObjectsIncrementCounterField,
} from '@kbn/core-saved-objects-api-server';
import { DEFAULT_REFRESH_SETTING } from '../../constants';
import { getCurrentTime, normalizeNamespace } from '../utils';
import { ApiExecutionContext } from '../types';

export interface PerformIncrementCounterInternalParams<T = unknown> {
  type: string;
  id: string;
  counterFields: Array<string | SavedObjectsIncrementCounterField>;
  options: SavedObjectsIncrementCounterOptions<T>;
}

export const incrementCounterInternal = async <T>(
  { type, id, counterFields, options }: PerformIncrementCounterInternalParams<T>,
  { registry, helpers, client, serializer }: ApiExecutionContext
): Promise<SavedObject<T>> => {
  const { common: commonHelper, preflight: preflightHelper, migration: migrationHelper } = helpers;

  const {
    migrationVersion,
    typeMigrationVersion,
    refresh = DEFAULT_REFRESH_SETTING,
    initialize = false,
    upsertAttributes,
    managed,
  } = options;

  if (!id) {
    throw SavedObjectsErrorHelpers.createBadRequestError('id cannot be empty'); // prevent potentially upserting a saved object with an empty ID
  }

  const normalizedCounterFields = counterFields.map((counterField) => {
    /**
     * no counterField configs provided, instead a field name string was passed.
     * ie `incrementCounter(so_type, id, ['my_field_name'])`
     * Using the default of incrementing by 1
     */
    if (typeof counterField === 'string') {
      return {
        fieldName: counterField,
        incrementBy: initialize ? 0 : 1,
      };
    }

    const { incrementBy = 1, fieldName } = counterField;

    return {
      fieldName,
      incrementBy: initialize ? 0 : incrementBy,
    };
  });
  const namespace = normalizeNamespace(options.namespace);

  const time = getCurrentTime();
  let savedObjectNamespace;
  let savedObjectNamespaces: string[] | undefined;

  if (registry.isSingleNamespace(type) && namespace) {
    savedObjectNamespace = namespace;
  } else if (registry.isMultiNamespace(type)) {
    // note: this check throws an error if the object is found but does not exist in this namespace
    const preflightResult = await preflightHelper.preflightCheckNamespaces({
      type,
      id,
      namespace,
    });
    if (preflightResult.checkResult === 'found_outside_namespace') {
      throw SavedObjectsErrorHelpers.createConflictError(type, id);
    }

    if (preflightResult.checkResult === 'not_found') {
      // If an upsert would result in the creation of a new object, we need to check for alias conflicts too.
      // This takes an extra round trip to Elasticsearch, but this won't happen often.
      // TODO: improve performance by combining these into a single preflight check
      await preflightHelper.preflightCheckForUpsertAliasConflict(type, id, namespace);
    }

    savedObjectNamespaces = preflightResult.savedObjectNamespaces;
  }

  // attributes: { [counterFieldName]: incrementBy },
  const migrated = migrationHelper.migrateInputDocument({
    id,
    type,
    ...(savedObjectNamespace && { namespace: savedObjectNamespace }),
    ...(savedObjectNamespaces && { namespaces: savedObjectNamespaces }),
    attributes: {
      ...(upsertAttributes ?? {}),
      ...normalizedCounterFields.reduce((acc, counterField) => {
        const { fieldName, incrementBy } = counterField;
        acc[fieldName] = incrementBy;
        return acc;
      }, {} as Record<string, number>),
    },
    migrationVersion,
    typeMigrationVersion,
    managed,
    updated_at: time,
  });

  const raw = serializer.savedObjectToRaw(migrated as SavedObjectSanitizedDoc);

  const body = await client.update<unknown, unknown, SavedObjectsRawDocSource>({
    id: raw._id,
    index: commonHelper.getIndexForType(type),
    refresh,
    require_alias: true,
    _source: true,
    body: {
      script: {
        source: `
              for (int i = 0; i < params.counterFieldNames.length; i++) {
                def counterFieldName = params.counterFieldNames[i];
                def count = params.counts[i];

                if (ctx._source[params.type][counterFieldName] == null) {
                  ctx._source[params.type][counterFieldName] = count;
                }
                else {
                  ctx._source[params.type][counterFieldName] += count;
                }
              }
              ctx._source.updated_at = params.time;
            `,
        lang: 'painless',
        params: {
          counts: normalizedCounterFields.map(
            (normalizedCounterField) => normalizedCounterField.incrementBy
          ),
          counterFieldNames: normalizedCounterFields.map(
            (normalizedCounterField) => normalizedCounterField.fieldName
          ),
          time,
          type,
        },
      },
      upsert: raw._source,
    },
  });

  const { originId } = body.get?._source ?? {};
  return {
    id,
    type,
    ...(savedObjectNamespaces && { namespaces: savedObjectNamespaces }),
    ...(originId && { originId }),
    updated_at: time,
    references: body.get?._source.references ?? [],
    version: encodeHitVersion(body),
    attributes: body.get?._source[type],
    ...(managed && { managed }),
  };
};
