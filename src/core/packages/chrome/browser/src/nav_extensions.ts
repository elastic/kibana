/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Serializable } from '@kbn/utility-types';
import type { Observable } from 'rxjs';

/**
 * Augmentable registry of navigation extensions. Publisher plugins declare the extensions
 * they expose by merging entries into this interface, keyed by `extensionId`.
 *
 * @example
 * ```ts
 * declare module '@kbn/core-chrome-browser' {
 *   interface NavExtensionRegistry {
 *     recentlyAccessedDashboards: NavExtensionEntry<RecentItemRow[]>;
 *   }
 * }
 * ```
 */
/* eslint-disable-next-line @typescript-eslint/no-empty-interface */
export interface NavExtensionRegistry {}

/** A registry entry declaring the data contract an extension template receives. */
export interface NavExtensionEntry<Data = Serializable> {
  /** Value passed to the extension template's `data` prop. */
  data: Data;
}

/**
 * Union of all registered extension ids. Falls back to `string` when no publisher is in the
 * current compilation (dependency-scoped visibility): you get the precise union wherever the
 * publishing module is in your TS graph, and a permissive `string` (rather than a spurious
 * `never`) in shared modules that legitimately reference an id without depending on its publisher.
 */
export type NavExtensionId = [keyof NavExtensionRegistry] extends [never]
  ? string
  : keyof NavExtensionRegistry;

/** The data contract (element type the extension template receives) for a given extension id. */
export type NavExtensionData<Id extends NavExtensionId> = Id extends keyof NavExtensionRegistry
  ? NavExtensionRegistry[Id] extends NavExtensionEntry<infer Data>
    ? Data
    : Serializable
  : Serializable;

/**
 * Runtime-erased template definition transported through the chrome `project` API. Chrome and the
 * side navigation shell do not know template configs; they only carry this opaque definition to the
 * template host, which re-applies the precise types from the templates package. The typed
 * `NavExtensionDefinition<Id>` (templates package) is structurally assignable to this.
 */
export interface NavExtensionRuntimeDefinition {
  id: string;
  templateId: string;
  config: unknown;
}

/** Runtime map of template definitions exposed to the template host, keyed by extension id. */
export type NavExtensionRuntimeDefinitionMap = Record<string, NavExtensionRuntimeDefinition>;

/** Internal registry entry including the chrome-owned data factory. */
export interface NavExtensionRegistryEntry extends NavExtensionRuntimeDefinition {
  createData$: () => Observable<Serializable>;
}

/** Full extension registry passed to chrome at navigation start, keyed by extension id. */
export type NavExtensionRegistryEntryMap = Record<string, NavExtensionRegistryEntry>;
