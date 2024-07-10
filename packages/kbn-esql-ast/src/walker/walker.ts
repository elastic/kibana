/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type {
  ESQLAstCommand,
  ESQLAstItem,
  ESQLAstNode,
  ESQLColumn,
  ESQLFunction,
  ESQLLiteral,
  ESQLParamLiteral,
  ESQLSingleAstItem,
} from '../types';

export interface WalkerOptions {
  visitSingleAstItem?: (node: ESQLSingleAstItem) => void;
  visitFunction?: (node: ESQLFunction) => void;
  visitColumn?: (node: ESQLColumn) => void;
  visitLiteral?: (node: ESQLLiteral) => void;
}

export class Walker {
  /**
   * Walks the AST and calls the appropriate visitor functions.
   */
  public static readonly walk = (
    node: ESQLAstNode | ESQLAstNode[],
    options: WalkerOptions
  ): Walker => {
    const walker = new Walker(options);
    walker.walk(node);
    return walker;
  };

  /**
   * Walks the AST and extracts all parameter literals.
   *
   * @param node AST node to extract parameters from.
   */
  public static readonly params = (node: ESQLAstNode | ESQLAstNode[]): ESQLParamLiteral[] => {
    const params: ESQLParamLiteral[] = [];
    Walker.walk(node, {
      visitLiteral: (param) => {
        if (param.literalType === 'param') {
          params.push(param);
        }
      },
    });
    return params;
  };

  /**
   * Returns the first function that matches the predicate.
   *
   * @param node AST subtree to search in.
   * @param predicate Function to test each function with.
   * @returns The first function that matches the predicate.
   */
  public static readonly findFunction = (
    node: ESQLAstNode | ESQLAstNode[],
    predicate: (fn: ESQLFunction) => boolean
  ): ESQLFunction | undefined => {
    let found: ESQLFunction | undefined;
    Walker.walk(node, {
      visitFunction: (fn) => {
        if (!found && predicate(fn)) {
          found = fn;
        }
      },
    });
    return found;
  };

  /**
   * Searches for at least one occurrence of a function or expression in the AST.
   *
   * @param node AST subtree to search in.
   * @param name Function or expression name to search for.
   * @returns True if the function or expression is found in the AST.
   */
  public static readonly hasFunction = (
    node: ESQLAstNode | ESQLAstNode[],
    name: string
  ): boolean => {
    return !!Walker.findFunction(node, (fn) => fn.name === name);
  };

  constructor(protected readonly options: WalkerOptions) {}

  public walk(node: undefined | ESQLAstNode | ESQLAstNode[]): void {
    if (!node) return;

    if (node instanceof Array) {
      for (const item of node) this.walk(item);
      return;
    }

    switch (node.type) {
      case 'command': {
        this.walkCommand(node as ESQLAstCommand);
        break;
      }
      default: {
        this.walkAstItem(node as ESQLAstItem);
        break;
      }
    }
  }

  public walkCommand(node: ESQLAstCommand): void {
    switch (node.name) {
      default: {
        this.walk(node.args);
        break;
      }
    }
  }

  public walkAstItem(node: ESQLAstItem): void {
    if (node instanceof Array) {
      const list = node as ESQLAstItem[];
      for (const item of list) this.walkAstItem(item);
    } else {
      const item = node as ESQLSingleAstItem;
      this.walkSingleAstItem(item);
    }
  }

  public walkSingleAstItem(node: ESQLSingleAstItem): void {
    const { options } = this;
    options.visitSingleAstItem?.(node);
    switch (node.type) {
      case 'function': {
        this.walkFunction(node as ESQLFunction);
        break;
      }
      case 'column': {
        options.visitColumn?.(node);
        break;
      }
      case 'literal': {
        options.visitLiteral?.(node);
        break;
      }
    }
  }

  public walkFunction(node: ESQLFunction): void {
    this.options.visitFunction?.(node);
    const args = node.args;
    const length = args.length;
    for (let i = 0; i < length; i++) {
      const arg = args[i];
      this.walkAstItem(arg);
    }
  }
}

export const walk = Walker.walk;
