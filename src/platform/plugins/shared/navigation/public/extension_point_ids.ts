/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { NavigationTreeDefinition } from '@kbn/core-chrome-browser';

interface ExtensionPointNode {
  renderAs: 'extensionPoint';
  extensionPointId: string;
}

type ExtractFromNode<Node> = Node extends ExtensionPointNode
  ? Node['extensionPointId']
  : Node extends { children: infer Children extends readonly unknown[] }
  ? ExtractExtensionPointIdsFromNodes<Children>
  : never;

type ExtractExtensionPointIdsFromNodes<Nodes extends readonly unknown[]> = ExtractFromNode<
  Nodes[number]
>;

/** Collects literal extensionPointId values from a navigation tree definition. */
export type ExtractExtensionPointIds<T extends NavigationTreeDefinition> =
  | ExtractExtensionPointIdsFromNodes<T['body']>
  | (T['footer'] extends readonly unknown[]
      ? ExtractExtensionPointIdsFromNodes<T['footer']>
      : never);
