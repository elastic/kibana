/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { AggregationsMultiBucketAggregateBase } from '@elastic/elasticsearch/lib/api/types';
import * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { i18n } from '@kbn/i18n';
import { flatten } from 'lodash';
import type { DeprecationsDetails } from '../../deprecations';
import { IScopedClusterClient } from '../../elasticsearch';
import { ISavedObjectTypeRegistry } from '../saved_objects_type_registry';
import { SavedObjectsRawDocSource } from '../serialization';
import { getIndexForType } from '../service/lib';

interface UnknownTypesDeprecationOptions {
  typeRegistry: ISavedObjectTypeRegistry;
  esClient: IScopedClusterClient;
  kibanaIndex: string;
  kibanaVersion: string;
}

const getKnownTypes = (typeRegistry: ISavedObjectTypeRegistry) =>
  typeRegistry.getAllTypes().map((type) => type.name);

const getTargetIndices = ({
  types,
  typeRegistry,
  kibanaVersion,
  kibanaIndex,
}: {
  types: string[];
  typeRegistry: ISavedObjectTypeRegistry;
  kibanaIndex: string;
  kibanaVersion: string;
}) => {
  return [
    ...new Set(
      types.map((type) =>
        getIndexForType({
          type,
          typeRegistry,
          kibanaVersion,
          defaultIndex: kibanaIndex,
        })
      )
    ),
  ];
};

const getNonRegisteredTypesQuery = (knownTypes: string[]): estypes.QueryDslQueryContainer => {
  return {
    bool: {
      must_not: knownTypes.map((type) => ({
        term: { type },
      })),
    },
  };
};

const getNonRegisteredTypesDocuments = async (
  esClient: IScopedClusterClient,
  targetIndices: string[],
  knownTypes: string[]
) => {
  const query = getNonRegisteredTypesQuery(knownTypes);
  const body = await esClient.asInternalUser.search<SavedObjectsRawDocSource>({
    index: targetIndices,
    body: {
      size: 0,
      // filter the known types
      query,
      // aggregate them by type, so that we have a sneak peak of all types
      aggs: {
        unknownTypesAggregation: {
          terms: {
            // assign type __UNKNOWN__ to those documents that don't define one
            missing: '__UNKNOWN__',
            field: 'type',
            size: 1000, // collect up to 1000 non-registered types
          },
          aggs: {
            docs: {
              top_hits: {
                size: 100, // collect up to 100 docs for each non-registered type
                _source: {
                  excludes: ['*'],
                },
              },
            },
          },
        },
      },
    },
  });

  if (!body.aggregations) return [];

  const { unknownTypesAggregation } = body.aggregations;
  const buckets = (unknownTypesAggregation as AggregationsMultiBucketAggregateBase).buckets;

  const bucketsArray = Array.isArray(buckets) ? buckets : Object.values(buckets);

  return flatten(
    bucketsArray.map(
      (bucket: any) =>
        bucket.docs?.hits?.hits?.map((doc: any) => ({
          id: doc._id,
          type: bucket.key,
        })) || []
    )
  );
};

const getUnknownSavedObjects = async ({
  typeRegistry,
  esClient,
  kibanaIndex,
  kibanaVersion,
}: UnknownTypesDeprecationOptions) => {
  const knownTypes = getKnownTypes(typeRegistry);
  const targetIndices = getTargetIndices({
    types: knownTypes,
    typeRegistry,
    kibanaIndex,
    kibanaVersion,
  });
  return await getNonRegisteredTypesDocuments(esClient, targetIndices, knownTypes);
};

export const getUnknownTypesDeprecations = async (
  options: UnknownTypesDeprecationOptions
): Promise<DeprecationsDetails[]> => {
  const deprecations: DeprecationsDetails[] = [];
  const unknownDocs = await getUnknownSavedObjects(options);
  if (unknownDocs.length) {
    deprecations.push({
      title: i18n.translate('core.savedObjects.deprecations.unknownTypes.title', {
        defaultMessage: 'Saved objects with unknown types are present in Kibana system indices',
      }),
      message: i18n.translate('core.savedObjects.deprecations.unknownTypes.message', {
        defaultMessage:
          '{objectCount, plural, one {# object} other {# objects}} with unknown types {objectCount, plural, one {was} other {were}} found in Kibana system indices. ' +
          'Upgrading with unknown savedObject types is no longer supported. ' +
          `To ensure that upgrades will succeed in the future, either re-enable plugins or delete these documents from the Kibana indices`,
        values: {
          objectCount: unknownDocs.length,
        },
      }),
      level: 'critical',
      requireRestart: false,
      deprecationType: undefined, // not config nor feature...
      correctiveActions: {
        manualSteps: [
          i18n.translate('core.savedObjects.deprecations.unknownTypes.manualSteps.1', {
            defaultMessage: 'Enable disabled plugins then restart Kibana.',
          }),
          i18n.translate('core.savedObjects.deprecations.unknownTypes.manualSteps.2', {
            defaultMessage:
              'If no plugins are disabled, or if enabling them does not fix the issue, delete the documents.',
          }),
        ],
        api: {
          path: '/internal/saved_objects/deprecations/_delete_unknown_types',
          method: 'POST',
          body: {},
        },
      },
    });
  }
  return deprecations;
};

interface DeleteUnknownTypesOptions {
  typeRegistry: ISavedObjectTypeRegistry;
  esClient: IScopedClusterClient;
  kibanaIndex: string;
  kibanaVersion: string;
}

export const deleteUnknownTypeObjects = async ({
  esClient,
  typeRegistry,
  kibanaIndex,
  kibanaVersion,
}: DeleteUnknownTypesOptions) => {
  const knownTypes = getKnownTypes(typeRegistry);
  const targetIndices = getTargetIndices({
    types: knownTypes,
    typeRegistry,
    kibanaIndex,
    kibanaVersion,
  });
  const nonRegisteredTypesQuery = getNonRegisteredTypesQuery(knownTypes);

  await esClient.asInternalUser.deleteByQuery({
    index: targetIndices,
    wait_for_completion: false,
    body: {
      query: nonRegisteredTypesQuery,
    },
  });
};
