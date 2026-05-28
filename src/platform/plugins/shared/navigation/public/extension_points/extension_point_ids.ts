/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  NavigationTreeDefinition,
  RootNodeDefinition,
  ExtensionPointNodeDefinition,
} from '@kbn/core-chrome-browser';

type ExtractFromPanelOpenerChild<Node> = Node extends ExtensionPointNodeDefinition
  ? Node['extensionPointId']
  : never;

type ExtractExtensionPointIdsFromPanelOpenerChildren<Children extends readonly unknown[]> =
  ExtractFromPanelOpenerChild<Children[number]>;

type ExtractFromRoot<Node> = Node extends Extract<
  RootNodeDefinition,
  { renderAs: 'panelOpener'; children: infer Children }
>
  ? ExtractExtensionPointIdsFromPanelOpenerChildren<Children>
  : never;

type ExtractExtensionPointIdsFromNodes<Nodes extends readonly unknown[]> = ExtractFromRoot<
  Nodes[number]
>;

/** Collects literal extensionPointId values from panelOpener children in a navigation tree. */
export type ExtractExtensionPointIds<T extends NavigationTreeDefinition> =
  | ExtractExtensionPointIdsFromNodes<T['body']>
  | (T['footer'] extends readonly unknown[]
      ? ExtractExtensionPointIdsFromNodes<T['footer']>
      : never);
