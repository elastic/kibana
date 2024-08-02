/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ResolvedRef } from '../../../ref_resolver/resolved_ref';
import { DocumentNode, RefNode } from '../../types/node';
import { TraverseDocumentNodeContext } from './traverse_document_node_context';

/**
 * OpenAPI tree is traversed in two phases
 *
 * 1. Diving from root to leaves.
 *    Allows to analyze unprocessed nodes and calculate any metrics if necessary.
 *
 * 2. Post order traversal from leaves to root.
 *    Mostly to transform the OpenAPI document.
 *
 * Document or document node processor gives flexibility in modifying OpenAPI specs and/or collect some metrics.
 * For convenience there are following node processors supported
 *
 * 1st phase
 *
 * - `onNodeEnter` - Callback function is invoked at the first phase (diving from root to leaves) while
 *             traversing the document. It can be considered in a similar way events dive in DOM during
 *             capture phase. In the other words it means entering a subtree. It allows to analyze
 *             unprocessed nodes.
 *
 * - `shouldRemove` - Callback function is invoked at the first phase (diving from root to leaves) while
 *             traversing the document. It controls whether the node will be excluded from further processing
 *             and the result document eventually. Returning `true` excluded the node while returning `false`
 *             passes the node untouched.
 *
 * 2nd phase
 *
 * - `onNodeLeave` - Callback function is invoked upon leaving any type of node. It give an opportunity to
 *             modify the document like inline references or remove unwanted properties. It can be considered
 *             in a similar way event bubble in DOM during bubble phase. In the other words it means leaving
 *             a subtree.
 *
 * - `onRefNodeLeave` - Callback function is invoked upon leaving a reference node (a node having `$ref` key)
 *
 */
export interface DocumentNodeProcessor {
  shouldRemove?: ShouldRemoveNodeProcessorFn;
  onNodeEnter?: OnNodeEntryProcessorFn;
  onNodeLeave?: OnNodeLeaveProcessorFn;
  onRefNodeLeave?: OnRefNodeLeaveProcessorFn;
}

/**
 * Should remove processor controls whether a node and all its descendants
 * should be omitted from the further processing and result document.
 *
 * When result is
 *
 * - `true` - omit the node
 * - `false` - keep the node
 *
 */
type ShouldRemoveNodeProcessorFn = (
  node: Readonly<DocumentNode>,
  context: TraverseDocumentNodeContext
) => boolean;

type OnNodeEntryProcessorFn = (
  node: Readonly<DocumentNode>,
  context: TraverseDocumentNodeContext
) => void;

type OnNodeLeaveProcessorFn = (node: DocumentNode, context: TraverseDocumentNodeContext) => void;

type OnRefNodeLeaveProcessorFn = (
  node: RefNode,
  resolvedRef: ResolvedRef,
  context: TraverseDocumentNodeContext
) => void;
