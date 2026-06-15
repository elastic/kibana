/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Observable } from 'rxjs';
import type {
  NavigationTreeDefinition,
  RootNodeDefinition,
  ExtensionPointNodeDefinition,
  NavExtensionData,
  NavExtensionId,
} from '@kbn/core-chrome-browser';

/** A `{ slotId, extensionId }` placement pair extracted from an extension node. */
interface SlotPair {
  slotId: string;
  extensionId: NavExtensionId;
}

type SlotPairFromChild<Node> = Node extends ExtensionPointNodeDefinition
  ? Node extends { slotId: infer S; extensionId: infer E }
    ? S extends string
      ? E extends NavExtensionId
        ? { slotId: S; extensionId: E }
        : never
      : never
    : never
  : never;

type SlotPairsFromPanelOpenerChildren<Children extends readonly unknown[]> = SlotPairFromChild<
  Children[number]
>;

type SlotPairsFromRoot<Node> = Node extends Extract<
  RootNodeDefinition,
  { renderAs: 'panelOpener'; children: infer Children }
>
  ? Children extends readonly unknown[]
    ? SlotPairsFromPanelOpenerChildren<Children>
    : never
  : never;

type SlotPairsFromNodes<Nodes extends readonly unknown[]> = SlotPairsFromRoot<Nodes[number]>;

/** Union of every `{ slotId, extensionId }` placement used in a navigation tree. */
export type ExtractSlots<T extends NavigationTreeDefinition> =
  | SlotPairsFromNodes<T['body']>
  | (T['footer'] extends readonly unknown[] ? SlotPairsFromNodes<T['footer']> : never);

/**
 * The slot data-source map a solution must supply at registration: keyed by every
 * `slotId` placed in the tree, each value an `Observable` emitting exactly the row
 * type the referenced extension declared in `NavExtensionRegistry`.
 */
export type SlotDataSourcesFor<T extends NavigationTreeDefinition> = {
  [P in Extract<ExtractSlots<T>, SlotPair> as P['slotId']]: Observable<
    NavExtensionData<P['extensionId']>
  >;
};
