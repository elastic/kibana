/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  CloudLinks,
  ChromeNavLink,
  ChromeProjectNavigationNode,
  NavigationCustomization,
  NavigationTreeDefinition,
  NavigationTreeDefinitionUI,
  SolutionId,
} from '@kbn/core-chrome-browser';
export interface ParsedNavigation {
  id: SolutionId;
  tree: ChromeProjectNavigationNode[];
  treeUI: NavigationTreeDefinitionUI;
  flattened: Record<string, ChromeProjectNavigationNode>;
  overflowItemIds: string[];
  defaultItemIds: string[];
  /**
   * Top-level body nodes the sidebar will actually render: hidden nodes removed
   * and panel-openers with no visible descendants pruned.
   */
  renderableNodes: ChromeProjectNavigationNode[];
}
/**
 * Applies user customization (moves + hidden) to a raw navigation tree definition,
 * parses the result, and returns the enriched {@link ParsedNavigation} structure.
 *
 * Moves are replayed sequentially on the default body order. Moves whose `id` or
 * `afterId` no longer exist in the current tree are silently skipped, making the
 * logic resilient to navigation items being added or removed across releases.
 *
 * `defaultItemIds` is captured from the *original* body (before any moves) so
 * callers can always determine which items ship with the solution by default.
 */
export declare const applyCustomization: (
  solutionId: SolutionId,
  def: NavigationTreeDefinition,
  deepLinks: Record<string, ChromeNavLink>,
  cloudLinks: CloudLinks,
  customization: NavigationCustomization | undefined
) => ParsedNavigation;
