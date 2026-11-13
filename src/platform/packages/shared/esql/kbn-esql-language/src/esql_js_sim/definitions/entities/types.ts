/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EntityType } from '../signatures/types';

/**
 * Where the values of an entity come from.
 *
 * - `language`: a fixed set the language defines, as the metadata fields.
 * - `cluster`: what exists in the cluster the query runs on, as the indices.
 * - `parent`: what another entity has, as the fields of an enrich policy.
 */
export type EntityOrigin = 'language' | 'cluster' | 'parent';

/** What the language says about a kind of entity. */
export interface EntityFacts {
  origin: EntityOrigin;
  /** For a `parent` origin: the entity that has the values. */
  parent?: EntityType;
}

/**
 * What narrows the entities that apply at a place. Whoever lists entities gets a scope and
 * nothing else: no command, no query text.
 */
export interface EntityScope {
  /** Only sources of this index mode. */
  indexMode?: 'time_series';
  /** The place is inside a subquery. */
  inSubquery: boolean;
  /** For an entity with a `parent` origin: the name of the parent, as the enrich policy. */
  parent?: string;
  /** For an inference endpoint: the task it must serve. */
  taskType?: string;
  /** The query runs on a serverless project. */
  isServerless: boolean;
}

/** An entity that can be named at a place. */
export interface EntityItem {
  name: string;
  /** What the entity is among its kind, as an index, an alias or a data stream for a source. */
  category?: string;
  /** Other names the same entity answers to. */
  aliases?: readonly string[];
  /** It exists and is not meant to be offered. */
  hidden?: boolean;
  /** It groups other entities, as an integration groups its data streams. */
  hasChildren?: boolean;
  /** The data type, for an entity that has one. */
  type?: string;
  /** What the entity is or holds, in a few words. */
  description?: string;
}
