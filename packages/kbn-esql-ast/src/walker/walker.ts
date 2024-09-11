/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type {
  ESQLAstCommand,
  ESQLAstComment,
  ESQLAstExpression,
  ESQLAstItem,
  ESQLAstNode,
  ESQLAstNodeFormatting,
  ESQLAstQueryExpression,
  ESQLColumn,
  ESQLCommand,
  ESQLCommandMode,
  ESQLCommandOption,
  ESQLFunction,
  ESQLInlineCast,
  ESQLList,
  ESQLLiteral,
  ESQLParamLiteral,
  ESQLProperNode,
  ESQLSingleAstItem,
  ESQLSource,
  ESQLTimeInterval,
  ESQLUnknownItem,
} from '../types';
import { NodeMatchTemplate, templateToPredicate } from './helpers';

type Node = ESQLAstNode | ESQLAstNode[];

export interface WalkerOptions {
  visitCommand?: (node: ESQLCommand) => void;
  visitCommandOption?: (node: ESQLCommandOption) => void;
  visitCommandMode?: (node: ESQLCommandMode) => void;
  /** @todo Rename to `visitExpression`. */
  visitSingleAstItem?: (node: ESQLAstExpression) => void;
  visitQuery?: (node: ESQLAstQueryExpression) => void;
  visitFunction?: (node: ESQLFunction) => void;
  visitSource?: (node: ESQLSource) => void;
  visitColumn?: (node: ESQLColumn) => void;
  visitLiteral?: (node: ESQLLiteral) => void;
  visitListLiteral?: (node: ESQLList) => void;
  visitTimeIntervalLiteral?: (node: ESQLTimeInterval) => void;
  visitInlineCast?: (node: ESQLInlineCast) => void;
  visitUnknown?: (node: ESQLUnknownItem) => void;

  /**
   * Called for any node type that does not have a specific visitor.
   *
   * @param node Any valid AST node.
   */
  visitAny?: (node: ESQLProperNode) => void;
}

export type WalkerAstNode = ESQLAstNode | ESQLAstNode[];

/**
 * Iterates over all nodes in the AST and calls the appropriate visitor
 * functions.
 *
 * AST nodes supported:
 *
 * - [x] command
 * - [x] option
 * - [x] mode
 * - [x] function
 * - [x] source
 * - [x] column
 * - [x] literal
 * - [x] list literal
 * - [x] timeInterval
 * - [x] inlineCast
 * - [x] unknown
 */
export class Walker {
  /**
   * Walks the AST and calls the appropriate visitor functions.
   */
  public static readonly walk = (node: WalkerAstNode, options: WalkerOptions): Walker => {
    const walker = new Walker(options);
    walker.walk(node);
    return walker;
  };

  /**
   * Walks the AST and extracts all command statements.
   *
   * @param node AST node to extract parameters from.
   */
  public static readonly commands = (node: Node): ESQLCommand[] => {
    const commands: ESQLCommand[] = [];
    walk(node, {
      visitCommand: (cmd) => commands.push(cmd),
    });
    return commands;
  };

  /**
   * Walks the AST and extracts all parameter literals.
   *
   * @param node AST node to extract parameters from.
   */
  public static readonly params = (node: WalkerAstNode): ESQLParamLiteral[] => {
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
   * Finds and returns the first node that matches the search criteria.
   *
   * @param node AST node to start the search from.
   * @param predicate A function that returns true if the node matches the search criteria.
   * @returns The first node that matches the search criteria.
   */
  public static readonly find = (
    node: WalkerAstNode,
    predicate: (node: ESQLProperNode) => boolean
  ): ESQLProperNode | undefined => {
    let found: ESQLProperNode | undefined;
    Walker.walk(node, {
      visitAny: (child) => {
        if (!found && predicate(child)) {
          found = child;
        }
      },
    });
    return found;
  };

  /**
   * Finds and returns all nodes that match the search criteria.
   *
   * @param node AST node to start the search from.
   * @param predicate A function that returns true if the node matches the search criteria.
   * @returns All nodes that match the search criteria.
   */
  public static readonly findAll = (
    node: WalkerAstNode,
    predicate: (node: ESQLProperNode) => boolean
  ): ESQLProperNode[] => {
    const list: ESQLProperNode[] = [];
    Walker.walk(node, {
      visitAny: (child) => {
        if (predicate(child)) {
          list.push(child);
        }
      },
    });
    return list;
  };

  /**
   * Matches a single node against a template object. Returns the first node
   * that matches the template.
   *
   * @param node AST node to match against the template.
   * @param template Template object to match against the node.
   * @returns The first node that matches the template
   */
  public static readonly match = (
    node: WalkerAstNode,
    template: NodeMatchTemplate
  ): ESQLProperNode | undefined => {
    const predicate = templateToPredicate(template);
    return Walker.find(node, predicate);
  };

  /**
   * Matches all nodes against a template object. Returns all nodes that match
   * the template.
   *
   * @param node AST node to match against the template.
   * @param template Template object to match against the node.
   * @returns All nodes that match the template
   */
  public static readonly matchAll = (
    node: WalkerAstNode,
    template: NodeMatchTemplate
  ): ESQLProperNode[] => {
    const predicate = templateToPredicate(template);
    return Walker.findAll(node, predicate);
  };

  /**
   * Finds the first function that matches the predicate.
   *
   * @param node AST node from which to search for a function
   * @param predicate Callback function to determine if the function is found
   * @returns The first function that matches the predicate
   */
  public static readonly findFunction = (
    node: WalkerAstNode,
    predicate: (node: ESQLFunction) => boolean
  ): ESQLFunction | undefined => {
    let found: ESQLFunction | undefined;
    Walker.walk(node, {
      visitFunction: (func) => {
        if (!found && predicate(func)) {
          found = func;
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

  public static readonly visitComments = (
    root: ESQLAstNode | ESQLAstNode[],
    callback: (
      comment: ESQLAstComment,
      node: ESQLProperNode,
      attachment: keyof ESQLAstNodeFormatting
    ) => void
  ): void => {
    Walker.walk(root, {
      visitAny: (node) => {
        const formatting = node.formatting;
        if (!formatting) return;

        if (formatting.top) {
          for (const decoration of formatting.top) {
            if (decoration.type === 'comment') {
              callback(decoration, node, 'top');
            }
          }
        }

        if (formatting.left) {
          for (const decoration of formatting.left) {
            if (decoration.type === 'comment') {
              callback(decoration, node, 'left');
            }
          }
        }

        if (formatting.right) {
          for (const decoration of formatting.right) {
            if (decoration.type === 'comment') {
              callback(decoration, node, 'right');
            }
          }
        }

        if (formatting.rightSingleLine) {
          callback(formatting.rightSingleLine, node, 'rightSingleLine');
        }

        if (formatting.bottom) {
          for (const decoration of formatting.bottom) {
            if (decoration.type === 'comment') {
              callback(decoration, node, 'bottom');
            }
          }
        }
      },
    });
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
    const { options } = this;
    (options.visitCommand ?? options.visitAny)?.(node);
    switch (node.name) {
      default: {
        this.walk(node.args);
        break;
      }
    }
  }

  public walkOption(node: ESQLCommandOption): void {
    const { options } = this;
    (options.visitCommandOption ?? options.visitAny)?.(node);
    for (const child of node.args) {
      this.walkAstItem(child);
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

  public walkMode(node: ESQLCommandMode): void {
    const { options } = this;
    (options.visitCommandMode ?? options.visitAny)?.(node);
  }

  public walkListLiteral(node: ESQLList): void {
    const { options } = this;
    (options.visitListLiteral ?? options.visitAny)?.(node);
    for (const value of node.values) {
      this.walkAstItem(value);
    }
  }

  public walkFunction(node: ESQLFunction): void {
    const { options } = this;
    (options.visitFunction ?? options.visitAny)?.(node);
    const args = node.args;
    const length = args.length;
    for (let i = 0; i < length; i++) {
      const arg = args[i];
      this.walkAstItem(arg);
    }
  }

  public walkQuery(node: ESQLAstQueryExpression): void {
    const { options } = this;
    (options.visitQuery ?? options.visitAny)?.(node);
    const commands = node.commands;
    const length = commands.length;
    for (let i = 0; i < length; i++) {
      const arg = commands[i];
      this.walkCommand(arg);
    }
  }

  public walkSingleAstItem(node: ESQLAstExpression): void {
    const { options } = this;
    options.visitSingleAstItem?.(node);
    switch (node.type) {
      case 'query': {
        this.walkQuery(node as ESQLAstQueryExpression);
        break;
      }
      case 'function': {
        this.walkFunction(node as ESQLFunction);
        break;
      }
      case 'option': {
        this.walkOption(node);
        break;
      }
      case 'mode': {
        this.walkMode(node);
        break;
      }
      case 'source': {
        (options.visitSource ?? options.visitAny)?.(node);
        break;
      }
      case 'column': {
        (options.visitColumn ?? options.visitAny)?.(node);
        break;
      }
      case 'literal': {
        (options.visitLiteral ?? options.visitAny)?.(node);
        break;
      }
      case 'list': {
        this.walkListLiteral(node);
        break;
      }
      case 'timeInterval': {
        (options.visitTimeIntervalLiteral ?? options.visitAny)?.(node);
        break;
      }
      case 'inlineCast': {
        (options.visitInlineCast ?? options.visitAny)?.(node);
        break;
      }
      case 'unknown': {
        (options.visitUnknown ?? options.visitAny)?.(node);
        break;
      }
    }
  }
}

export const walk = Walker.walk;
