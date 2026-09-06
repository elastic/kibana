/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export type { DiscoverQueryMode, DiscoverGotoOptions, DataViewOptions } from './base';
export { CascadeMixin } from './cascade';

/**
 * Page object for the Discover application.
 *
 * Composed from four mixin layers (each in its own file) while keeping a single flat
 * public API — no `discover.navigation.goto()` namespacing, which would break callers:
 *
 * - `navigation.ts` — goto, query mode, waits, clickAppMenuItem, ES|QL editor
 * - `save.ts`       — save / load / revert / share / export
 * - `layout.ts`     — data-view switcher, field editor, sidebar, histogram, doc table
 * - `cascade.ts`    — cascade ("grouped results") layout helpers
 *
 * The minimal facade surface that non-Discover production suites actually use is only
 * ~11 methods. Everything else lives here until Layer C (DiscoverPage subclass in
 * `discover/test/scout`) carves it out of the critical-files path.
 */
export { DiscoverApp } from './app';
