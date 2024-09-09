/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ESQLProperNode, ESQLAstBaseItem } from '../types';

/**
 * Node fields which are available only when the node is minted by the parser.
 * When creating nodes manually, these fields are not available.
 */
export type AstNodeParserFields = Pick<ESQLAstBaseItem, 'text' | 'location' | 'incomplete'>;

/**
 * The node *template* transforms ES|QL AST nodes into a permissive shape, with
 * the aim to:
 *
 * - Remove the `type` property, as the builder will set it.
 * - Make properties like `text`, `location`, and `incomplete` optional, as they
 *   are a available only when the AST node is minted by the parser.
 * - Make all other properties optional, for easy node creation.
 */
export type AstNodeTemplate<Node extends ESQLProperNode> = Omit<
  Node,
  'type' | 'text' | 'location' | 'incomplete'
> &
  Partial<Omit<Node, 'type'>>;
