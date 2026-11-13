/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ESQLCallbacks } from '@kbn/esql-types';
import type { EntityItem, EntityScope, EntityType } from '../../../esql_js_sim/definitions';

/** What the editor provides. Listing entities is the only thing the engine asks of it. */
export type EntityCallbacks = ESQLCallbacks;

/**
 * How the entities of one kind are listed. A definition returns data, never suggestions: how
 * an entity is shown is decided where suggestions are presented.
 */
export interface EntityDefinition {
  /** The entities that apply in a scope. */
  fetch: (callbacks: EntityCallbacks, scope: EntityScope) => Promise<EntityItem[]>;
  /**
   * Whether a name is one of the entities. Defaults to the name being among what `fetch`
   * returns; a source needs more, as a name may be a pattern or carry a selector.
   */
  exists?: (name: string, items: EntityItem[]) => boolean;
  /** The entities an entity groups, as the data streams of an integration. */
  children?: (item: EntityItem) => EntityItem[];
}

/** One definition per kind of entity. A kind without a definition does not compile. */
export type EntityRegistry = Readonly<Record<EntityType, EntityDefinition>>;
