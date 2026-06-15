/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

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

/** A registry entry declaring the row-data contract a slot's `data$` emits for an extension. */
export interface NavExtensionEntry<Data = unknown> {
  /** Element type the slot's `data$` must emit. */
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

/** The data contract (element type the slot's `data$` emits) for a given extension id. */
export type NavExtensionData<Id extends NavExtensionId> = Id extends keyof NavExtensionRegistry
  ? NavExtensionRegistry[Id] extends NavExtensionEntry<infer Data>
    ? Data
    : unknown
  : unknown;

/**
 * Runtime-erased definition transported through the chrome `project` API. Chrome and the side
 * navigation shell do not know template configs; they only carry this opaque definition to the
 * template host, which re-applies the precise types from the templates package. The typed
 * `NavExtensionDefinition<Id>` (templates package) is structurally assignable to this.
 */
export interface NavExtensionRuntimeDefinition {
  id: string;
  templateId: string;
  config: unknown;
}

/** Runtime map of all registered extension definitions, keyed by extension id. */
export type NavExtensionDefinitionMap = Partial<Record<string, NavExtensionRuntimeDefinition>>;
