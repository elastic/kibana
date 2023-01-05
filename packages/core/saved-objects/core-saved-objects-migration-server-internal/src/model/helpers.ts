/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { gt, valid } from 'semver';
import type {
  QueryDslBoolQuery,
  QueryDslQueryContainer,
} from '@elastic/elasticsearch/lib/api/types';
import * as Either from 'fp-ts/lib/Either';
import type { IndexMapping } from '@kbn/core-saved-objects-base-server-internal';
import type { State } from '../state';
import type { AliasAction, FetchIndexResponse } from '../actions';

/**
 * A helper function/type for ensuring that all control state's are handled.
 */
export function throwBadControlState(p: never): never;
export function throwBadControlState(controlState: any) {
  throw new Error('Unexpected control state: ' + controlState);
}

/**
 * A helper function/type for ensuring that all response types are handled.
 */
export function throwBadResponse(state: State, p: never): never;
export function throwBadResponse(state: State, res: any): never {
  throw new Error(
    `${state.controlState} received unexpected action response: ` + JSON.stringify(res)
  );
}

/**
 * Merge the _meta.migrationMappingPropertyHashes mappings of an index with
 * the given target mappings.
 *
 * @remarks When another instance already completed a migration, the existing
 * target index might contain documents and mappings created by a plugin that
 * is disabled in the current Kibana instance performing this migration.
 * Mapping updates are commutative (deeply merged) by Elasticsearch, except
 * for the `_meta` key. By merging the `_meta.migrationMappingPropertyHashes`
 * mappings from the existing target index index into the targetMappings we
 * ensure that any `migrationPropertyHashes` for disabled plugins aren't lost.
 *
 * Right now we don't use these `migrationPropertyHashes` but it could be used
 * in the future to detect if mappings were changed. If mappings weren't
 * changed we don't need to reindex but can clone the index to save disk space.
 *
 * @param targetMappings
 * @param indexMappings
 */
export function mergeMigrationMappingPropertyHashes(
  targetMappings: IndexMapping,
  indexMappings: IndexMapping
) {
  return {
    ...targetMappings,
    _meta: {
      migrationMappingPropertyHashes: {
        ...indexMappings._meta?.migrationMappingPropertyHashes,
        ...targetMappings._meta?.migrationMappingPropertyHashes,
      },
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
  aliases: Record<string, string | undefined>
): boolean {
  return aliases[currentAlias] != null && aliases[currentAlias] === aliases[versionAlias];
}

export function indexBelongsToLaterVersion(indexName: string, kibanaVersion: string): boolean {
  const version = valid(indexVersion(indexName));
  return version != null ? gt(version, kibanaVersion) : false;
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
 * @param boolQuery the bool query to be enriched
 * @param mustClauses the clauses to be added to a 'must'
 * @returns a new query container with the enriched query
 */
export function addMustClausesToBoolQuery(
  mustClauses: QueryDslQueryContainer[],
  boolQuery?: QueryDslBoolQuery
): QueryDslQueryContainer {
  let must: QueryDslQueryContainer[] = [];

  if (boolQuery?.must) {
    must = must.concat(boolQuery.must);
  }

  must.push(...mustClauses);

  return {
    bool: {
      ...boolQuery,
      must,
    },
  };
}

/**
 * Add the given clauses to the 'must_not' of the given query
 * @param boolQuery the bool query to be enriched
 * @param mustNotClauses the clauses to be added to a 'must_not'
 * @returns a new query container with the enriched query
 */
export function addMustNotClausesToBoolQuery(
  mustNotClauses: QueryDslQueryContainer[],
  boolQuery?: QueryDslBoolQuery
): QueryDslQueryContainer {
  let mustNot: QueryDslQueryContainer[] = [];

  if (boolQuery?.must_not) {
    mustNot = mustNot.concat(boolQuery.must_not);
  }

  mustNot.push(...mustNotClauses);

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
 * Creates a record of alias -> index name pairs
 */
export function getAliases(
  indices: FetchIndexResponse
): Either.Either<
  { type: 'multiple_indices_per_alias'; alias: string; indices: string[] },
  Record<string, string | undefined>
> {
  const aliases = {} as Record<string, string | undefined>;
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
