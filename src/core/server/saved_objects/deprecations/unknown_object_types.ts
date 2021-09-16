/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { estypes } from '@elastic/elasticsearch';
import { i18n } from '@kbn/i18n';
import type { DeprecationsDetails } from '../../deprecations';
import { IScopedClusterClient } from '../../elasticsearch';
import { ISavedObjectTypeRegistry } from '../saved_objects_type_registry';
import { SavedObjectsRawDocSource } from '../serialization';
import type { KibanaConfigType } from '../../kibana_config';
import type { SavedObjectConfig } from '../saved_objects_config';
import { getIndexForType } from '../service/lib';

interface UnknownTypesDeprecationOptions {
  typeRegistry: ISavedObjectTypeRegistry;
  esClient: IScopedClusterClient;
  kibanaConfig: KibanaConfigType;
  savedObjectsConfig: SavedObjectConfig;
  kibanaVersion: string;
}

const getKnownTypes = (typeRegistry: ISavedObjectTypeRegistry) =>
  typeRegistry.getAllTypes().map((type) => type.name);

const getTargetIndices = ({
  types,
  typeRegistry,
  kibanaVersion,
  kibanaConfig,
  savedObjectsConfig,
}: {
  types: string[];
  typeRegistry: ISavedObjectTypeRegistry;
  savedObjectsConfig: SavedObjectConfig;
  kibanaConfig: KibanaConfigType;
  kibanaVersion: string;
}) => {
  return [
    ...new Set(
      types.map((type) =>
        getIndexForType({
          type,
          typeRegistry,
          migV2Enabled: savedObjectsConfig.migration.enableV2,
          kibanaVersion,
          defaultIndex: kibanaConfig.index,
        })
      )
    ),
  ];
};

const getUnknownTypesQuery = (knownTypes: string[]): estypes.QueryDslQueryContainer => {
  return {
    bool: {
      must_not: knownTypes.map((type) => ({
        term: { type },
      })),
    },
  };
};

const getUnknownSavedObjects = async ({
  typeRegistry,
  esClient,
  kibanaConfig,
  savedObjectsConfig,
  kibanaVersion,
}: UnknownTypesDeprecationOptions) => {
  const knownTypes = getKnownTypes(typeRegistry);
  const targetIndices = getTargetIndices({
    types: knownTypes,
    typeRegistry,
    kibanaConfig,
    kibanaVersion,
    savedObjectsConfig,
  });
  const query = getUnknownTypesQuery(knownTypes);

  const { body } = await esClient.asInternalUser.search<SavedObjectsRawDocSource>({
    index: targetIndices,
    body: {
      size: 10000,
      query,
    },
  });
  const { hits: unknownDocs } = body.hits;

  return unknownDocs.map((doc) => ({ id: doc._id, type: doc._source?.type ?? 'unknown' }));
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
  kibanaConfig: KibanaConfigType;
  savedObjectsConfig: SavedObjectConfig;
  kibanaVersion: string;
}

export const deleteUnknownTypeObjects = async ({
  esClient,
  typeRegistry,
  kibanaConfig,
  savedObjectsConfig,
  kibanaVersion,
}: DeleteUnknownTypesOptions) => {
  const knownTypes = getKnownTypes(typeRegistry);
  const targetIndices = getTargetIndices({
    types: knownTypes,
    typeRegistry,
    kibanaConfig,
    kibanaVersion,
    savedObjectsConfig,
  });
  const query = getUnknownTypesQuery(knownTypes);

  await esClient.asInternalUser.deleteByQuery({
    index: targetIndices,
    wait_for_completion: false,
    body: {
      query,
    },
  });
};
