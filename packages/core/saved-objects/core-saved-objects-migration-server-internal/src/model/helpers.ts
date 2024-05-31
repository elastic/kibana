/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { gt, valid } from 'semver';
import type {
  BulkOperationContainer,
  QueryDslBoolQuery,
  QueryDslQueryContainer,
} from '@elastic/elasticsearch/lib/api/types';
import * as Either from 'fp-ts/lib/Either';
import type { SavedObjectsRawDoc } from '@kbn/core-saved-objects-server';
import type { IndexMapping } from '@kbn/core-saved-objects-base-server-internal';
import type { AliasAction, FetchIndexResponse } from '../actions';
import type { BulkIndexOperationTuple } from './create_batches';
import type { BaseState, OutdatedDocumentsSearchRead, ReindexSourceToTempRead } from '../state';

/** @internal */
export const REINDEX_TEMP_SUFFIX = '_reindex_temp';

/** @internal */
export type Aliases = Partial<Record<string, string>>;

/**
 * A helper function/type for ensuring that all control state's are handled.
 */
export function throwBadControlState(p: never): never;
export function throwBadControlState(controlState: unknown) {
  throw new Error('Unexpected control state: ' + controlState);
}

/**
 * A helper function/type for ensuring that all response types are handled.
 */
export function throwBadResponse(state: { controlState: string }, p: never): never;
export function throwBadResponse(state: { controlState: string }, res: unknown): never {
  throw new Error(
    `${state.controlState} received unexpected action response: ` + JSON.stringify(res)
  );
}

/**
 * Merge the mappings._meta information of an index with the given target mappings.
 *
 * @remarks When another instance already completed a migration, the existing
 * target index might contain documents and mappings created by a plugin that
 * is disabled in the current Kibana instance performing this migration.
 * Mapping updates are commutative (deeply merged) by Elasticsearch, except
 * for the `_meta` key. By merging the `_meta` from the existing target index
 * into the targetMappings we ensure that any versions for disabled plugins aren't lost.
 *
 * @param targetMappings
 * @param indexMappings
 */
export function mergeMappingMeta(targetMappings: IndexMapping, indexMappings: IndexMapping) {
  const mappingVersions = {
    ...indexMappings._meta?.mappingVersions,
    ...targetMappings._meta?.mappingVersions,
  };

  const migrationMappingPropertyHashes = {
    ...indexMappings._meta?.migrationMappingPropertyHashes,
    ...targetMappings._meta?.migrationMappingPropertyHashes,
  };

  return {
    ...targetMappings,
    _meta: {
      ...targetMappings._meta,
      ...(Object.keys(mappingVersions).length && { mappingVersions }),
      ...(Object.keys(migrationMappingPropertyHashes).length && { migrationMappingPropertyHashes }),
    },
  };
}

/**
 * If `.kibana` and the version specific aliases both exists and
 * are pointing to the same index. This version's migration has already
 * been completed.
 */
export function versionMigrationCompleted(
  currentAlias: string,
  versionAlias: string,
  aliases: Aliases
): boolean {
  return aliases[currentAlias] != null && aliases[currentAlias] === aliases[versionAlias];
}

export function indexBelongsToLaterVersion(kibanaVersion: string, indexName?: string): boolean {
  const version = valid(indexVersion(indexName));
  return version != null ? gt(version, kibanaVersion) : false;
}

export function hasLaterVersionAlias(
  kibanaVersion: string,
  aliases?: Partial<Record<string, string>>
): string | undefined {
  const mostRecentAlias = Object.keys(aliases ?? {})
    .filter(aliasVersion)
    .sort()
    .pop();

  const mostRecentAliasVersion = valid(aliasVersion(mostRecentAlias));

  return mostRecentAliasVersion != null && gt(mostRecentAliasVersion, kibanaVersion)
    ? mostRecentAlias
    : undefined;
}

/**
 * Add new must_not clauses to the given query
 * in order to filter out the specified types
 * @param boolQuery the bool query to be enriched
 * @param types the types to be filtered out
 * @returns a new query container with the enriched query
 */
export function addExcludedTypesToBoolQuery(
  types: string[],
  boolQuery?: QueryDslBoolQuery
): QueryDslQueryContainer {
  return addMustNotClausesToBoolQuery(
    types.map((type) => ({ term: { type } })),
    boolQuery
  );
}

/**
 * Add the given clauses to the 'must' of the given query
 * @param filterClauses the clauses to be added to a 'must'
 * @param boolQuery the bool query to be enriched
 * @returns a new query container with the enriched query
 */
export function addMustClausesToBoolQuery(
  filterClauses: QueryDslQueryContainer[],
  boolQuery?: QueryDslBoolQuery
): QueryDslQueryContainer {
  let must: QueryDslQueryContainer[] = [];

  if (boolQuery?.must) {
    must = must.concat(boolQuery.must);
  }

  must.push(...filterClauses);

  return {
    bool: {
      ...boolQuery,
      must,
    },
  };
}

/**
 * Add the given clauses to the 'must_not' of the given query
 * @param filterClauses the clauses to be added to a 'must_not'
 * @param boolQuery the bool query to be enriched
 * @returns a new query container with the enriched query
 */
export function addMustNotClausesToBoolQuery(
  filterClauses: QueryDslQueryContainer[],
  boolQuery?: QueryDslBoolQuery
): QueryDslQueryContainer {
  let mustNot: QueryDslQueryContainer[] = [];

  if (boolQuery?.must_not) {
    mustNot = mustNot.concat(boolQuery.must_not);
  }

  mustNot.push(...filterClauses);

  return {
    bool: {
      ...boolQuery,
      must_not: mustNot,
    },
  };
}

/**
 * Extracts the version number from a >= 7.11 index
 * @param indexName A >= v7.11 index name
 */
export function indexVersion(indexName?: string): string | undefined {
  return (indexName?.match(/.+_(\d+\.\d+\.\d+)_\d+/) || [])[1];
}

/**
 * Extracts the version number from a >= 7.11 index alias
 * @param indexName A >= v7.11 index alias
 */
export function aliasVersion(alias?: string): string | undefined {
  return (alias?.match(/.+_(\d+\.\d+\.\d+)/) || [])[1];
}

/** @internal */
export interface MultipleIndicesPerAlias {
  type: 'multiple_indices_per_alias';
  alias: string;
  indices: string[];
}

/**
 * Creates a record of alias -> index name pairs
 */
export function getAliases(
  indices: FetchIndexResponse
): Either.Either<MultipleIndicesPerAlias, Aliases> {
  const aliases = {} as Aliases;
  for (const index of Object.getOwnPropertyNames(indices)) {
    for (const alias of Object.getOwnPropertyNames(indices[index].aliases || {})) {
      const secondIndexThisAliasPointsTo = aliases[alias];
      if (secondIndexThisAliasPointsTo != null) {
        return Either.left({
          type: 'multiple_indices_per_alias',
          alias,
          indices: [secondIndexThisAliasPointsTo, index],
        });
      }
      aliases[alias] = index;
    }
  }

  return Either.right(aliases);
}

/**
 * Build a list of alias actions to remove the provided aliases from the given index.
 */
export function buildRemoveAliasActions(
  index: string,
  aliases: string[],
  exclude: string[]
): AliasAction[] {
  return aliases.flatMap((alias) => {
    if (exclude.includes(alias)) {
      return [];
    }
    return [{ remove: { index, alias, must_exist: true } }];
  });
}

/**
 * Given a document, creates a valid body to index the document using the Bulk API.
 */
export const createBulkIndexOperationTuple = (
  doc: SavedObjectsRawDoc,
  typeIndexMap: Record<string, string> = {}
): BulkIndexOperationTuple => {
  return [
    {
      index: {
        _id: doc._id,
        ...(typeIndexMap[doc._source.type] && {
          _index: typeIndexMap[doc._source.type],
        }),
        // use optimistic concurrency control to ensure that outdated
        // documents are only overwritten once with the latest version
        ...(typeof doc._seq_no !== 'undefined' && { if_seq_no: doc._seq_no }),
        ...(typeof doc._primary_term !== 'undefined' && { if_primary_term: doc._primary_term }),
      },
    },
    doc._source,
  ];
};

/**
 * Given a document id, creates a valid body to delete the document using the Bulk API.
 */
export const createBulkDeleteOperationBody = (_id: string): BulkOperationContainer => ({
  delete: { _id },
});

/** @internal */
export enum MigrationType {
  Compatible = 'compatible',
  Incompatible = 'incompatible',
  Unnecessary = 'unnecessary',
  Invalid = 'invalid',
}

interface MigrationTypeParams {
  isMappingsCompatible: boolean;
  isVersionMigrationCompleted: boolean;
}

export function getMigrationType({
  isMappingsCompatible,
  isVersionMigrationCompleted,
}: MigrationTypeParams): MigrationType {
  if (isMappingsCompatible && isVersionMigrationCompleted) {
    return MigrationType.Unnecessary;
  }

  if (isMappingsCompatible && !isVersionMigrationCompleted) {
    return MigrationType.Compatible;
  }

  if (!isMappingsCompatible && !isVersionMigrationCompleted) {
    return MigrationType.Incompatible;
  }

  return MigrationType.Invalid;
}

/**
 * Generate a temporary index name, to reindex documents into it
 * @param index The name of the SO index
 * @param kibanaVersion The current kibana version
 * @returns A temporary index name to reindex documents
 */
export const getTempIndexName = (indexPrefix: string, kibanaVersion: string): string =>
  `${indexPrefix}_${kibanaVersion}${REINDEX_TEMP_SUFFIX}`;

/** Increase batchSize by 20% until a maximum of maxBatchSize */
export const increaseBatchSize = (
  stateP: OutdatedDocumentsSearchRead | ReindexSourceToTempRead
) => {
  const increasedBatchSize = Math.floor(stateP.batchSize * 1.2);
  return increasedBatchSize > stateP.maxBatchSize ? stateP.maxBatchSize : increasedBatchSize;
};

export const getIndexTypes = (state: BaseState): string[] => {
  return state.indexTypesMap[state.indexPrefix];
};
