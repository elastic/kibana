/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import {
  getVirtualVersionMap,
  type IndexMapping,
} from '@kbn/core-saved-objects-base-server-internal';
import { getNewAndUpdatedTypes, getUpdatedRootFields } from '../core/compare_mappings';
import { buildPickupMappingsQuery } from '../core/build_pickup_mappings_query';
import { generateAdditiveMappingDiff } from '../zdt/utils';
import type { MigrationContext } from './context';

export interface MappingsUpdate {
  /** The additive changes to apply to the index mappings. */
  readonly mappings: IndexMapping;
  /** The documents that must pick up the new mappings, or `undefined` if none must. */
  readonly pickupQuery: QueryDslQueryContainer | undefined;
}

/**
 * Computes the mappings changes to apply to an existing index.
 *
 * Only the documents of the types whose mappings changed are picked up, or all of them if a root field changed.
 * Outdated documents are excluded: they will be rewritten with the new mappings when they are converted.
 */
export const getMappingsUpdate = (
  context: MigrationContext,
  previousMappings: IndexMapping
): MappingsUpdate => {
  const properties = generateAdditiveMappingDiff({
    types: context.typeDefinitions,
    mapping: previousMappings,
    deletedTypes: context.deletedTypes,
  });

  const { updatedTypes } = getNewAndUpdatedTypes({
    indexMeta: previousMappings._meta,
    indexTypes: context.types,
    latestMappingsVersions: context.latestMappingsVersions,
  });
  const rootFieldsChanged = getUpdatedRootFields(previousMappings).length > 0;

  const documents: QueryDslQueryContainer | undefined = rootFieldsChanged
    ? { match_all: {} }
    : updatedTypes.length > 0
    ? buildPickupMappingsQuery(updatedTypes)
    : undefined;

  // types without migrations nor model versions cannot be outdated, and the outdated
  // documents query of an index without such types has no clauses: it matches all documents
  const canBeOutdated = Object.values(
    getVirtualVersionMap({ types: context.typeDefinitions, useModelVersionsOnly: false })
  ).some((version) => version !== '0.0.0');

  return {
    mappings: { properties },
    pickupQuery:
      documents && canBeOutdated
        ? { bool: { must: [documents], must_not: [context.outdatedDocumentsQuery] } }
        : documents,
  };
};
