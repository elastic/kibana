/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { printTree } from 'tree-dump';
import { childrenOfAnyNode } from '../../ast/visitor/utils';
import { isParamLiteral } from '../../ast';
import type { ESQLProperNode } from '../../types';
import type { PromQLAstNode } from '../../promql/types';

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

  /**
   * The source text from which the AST was parsed.
   */
  src?: string;

  /**
   * Whether to print the source text of each node.
   */
  printSrc?: boolean;
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
  top: ESQLProperNode | PromQLAstNode,
  options?: PrintAstOptions,
  tab: string = ''
): string => {
  const maxDepth = options?.depth ?? 1e3;
  let nodesLeft = options?.limit ?? 1e5; // Remaining number of nodes to print
  const printSrc = options?.printSrc ?? false;
  const src = options?.src ?? '';

  const printNode = (
    node: ESQLProperNode | PromQLAstNode,
    currentTab: string,
    depth: number
  ): string => {
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
      name = node.name ? ` "${node.name}"` : isParamLiteral(node) ? ` ?${node.value}` : '';
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
      for (const child of childrenOfAnyNode(node)) {
        childrenTree.push((tabNested: string) => printNode(child, tabNested, depth + 1));
      }
    } else {
      childrenTree.push(() => '...');
    }

    let nodeSrc = '';

    if (printSrc && src && node.location) {
      const { min, max } = node.location;

      if (min >= 0 && max >= min) {
        nodeSrc = ` "${src.slice(min, max + 1)}"`.replace(/\n/g, '\\n');
      }
    }

    const header = `${type}${location}${name}${text}${inlineDetails}${nodeSrc}`;

    return header + printTree(currentTab, childrenTree);
  };

  return printNode(top, tab, 1);
};
