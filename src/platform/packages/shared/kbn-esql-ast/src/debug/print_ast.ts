/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { printTree } from 'tree-dump';
import { childrenFoAnyNode } from '../visitor/utils';
import type { ESQLProperNode } from '../types';

/**
 * Options for printing an AST.
 */
export interface PrintAstOptions {
  /**
   * Whether to include location information for each node in the output.
   *
   * @default true
   */
  location?: boolean;

  /**
   * Whether to include the contents `.text` property of each node in the output.
   *
   * @default true
   */
  text?: boolean;

  /**
   * Whether to print the AST in a compact form - only node types are printed.
   *
   * @default false
   */
  compact?: boolean;

  /**
   * The maximum depth to print the AST tree.
   *
   * @default Infinity
   */
  depth?: number;

  /**
   * Limits the total number of nodes printed.
   *
   * @default Infinity
   */
  limit?: number;
}

/**
 * Prints an AST expression as a tree structure for debugging purposes.
 *
 * @param top - The root AST expression to print
 * @param options - Options for printing the AST
 * @returns A string representation of the AST tree
 *
 * @example
 * ```typescript
 * const ast = parse('FROM index | WHERE field > 10');
 * console.log(printAst(ast));
 * ```
 */
export const printAst = (
  top: ESQLProperNode,
  options?: PrintAstOptions,
  tab: string = ''
): string => {
  const maxDepth = options?.depth ?? 1e3;
  let nodesLeft = options?.limit ?? 1e5; // Remaining number of nodes to print

  const printNode = (node: ESQLProperNode, currentTab: string, depth: number): string => {
    if (nodesLeft-- <= 0) {
      return '...';
    }

    const type = node.type || 'unknown';
    const childrenTree: Array<(tab: string) => string> = [];
    let location = '';
    let name = '';
    let text = '';
    let inlineDetails = '';

    if (!options?.compact) {
      name = node.name ? ` "${node.name}"` : '';
      location =
        node.location && (options?.location ?? true)
          ? ` ${node.location.min}-${node.location.max}`
          : '';
      text = !!options?.text && node.text ? `, text = "${node.text}"` : '';

      if (node.incomplete) {
        inlineDetails += ' INCOMPLETE';
      }
    }

    if (maxDepth > depth) {
      for (const child of childrenFoAnyNode(node)) {
        childrenTree.push((tabNested: string) => printNode(child, tabNested, depth + 1));
      }
    } else {
      childrenTree.push(() => '...');
    }

    const header = `${type}${location}${name}${text}${inlineDetails}`;

    return header + printTree(currentTab, childrenTree);
  };

  return printNode(top, tab, 1);
};
