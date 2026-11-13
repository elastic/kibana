/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EntityType } from '../signatures/types';
import type { EntityFacts } from './types';

/**
 * Every kind of entity an argument can name, with where its values come from. Adding a kind of
 * entity to the schema without describing it here does not compile.
 */
export const ENTITY_FACTS: Readonly<Record<EntityType, EntityFacts>> = {
  source: { origin: 'cluster' },
  lookup_index: { origin: 'cluster' },
  enrich_policy: { origin: 'cluster' },
  inference_endpoint: { origin: 'cluster' },
  enrich_field: { origin: 'parent', parent: 'enrich_policy' },
  metadata_field: { origin: 'language' },
  setting: { origin: 'language' },
};

/** The kinds of entity, for checking data that names one. */
export const ENTITY_TYPES = Object.keys(ENTITY_FACTS) as EntityType[];

/**
 * The values of the entities the language itself defines. The metadata fields a project adds
 * exist only on serverless.
 */
export const METADATA_FIELD_NAMES: readonly string[] = [
  '_version',
  '_id',
  '_index',
  '_source',
  '_ignored',
  '_index_mode',
  '_score',
  '_size',
  '_slice',
  '_name',
  '_class',
];

export const SERVERLESS_METADATA_FIELD_NAMES: readonly string[] = [
  '_project._id',
  '_project._alias',
  '_project._type',
  '_project._organization',
  '_project._csp',
  '_project._region',
];
