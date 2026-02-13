/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { PromQLAstNode } from '../../types';

/**
 * The node *template* transforms PromQL AST nodes into a permissive shape, with
 * the aim to:
 *
 * - Remove the `type` and `dialect` properties, as the builder will set them.
 * - Make properties like `text`, `location`, and `incomplete` optional, as they
 *   are available only when the AST node is minted by the parser.
 * - Make all other properties optional, for easy node creation.
 */
export type PromQLAstNodeTemplate<Node extends PromQLAstNode> = Omit<
  Node,
  'type' | 'dialect' | 'text' | 'location' | 'incomplete'
> &
  Partial<Omit<Node, 'type' | 'dialect'>>;
