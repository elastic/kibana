/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { resolveItem } from '../visitor/utils';
import { isPromqlNode, replaceProperties, templateToPredicate } from './helpers';
import { PromqlWalker, type PromqlWalkerOptions } from '../../promql/walker';
import type * as types from '../../types';
import type * as promql from '../../promql/types';
import type { NodeMatchTemplate } from './helpers';

type Node = types.ESQLAstNode | types.ESQLAstNode[];

export interface WalkerOptions {
  // ----------------------------------------------------------- PromQL options

  promql?: PromqlWalkerOptions;

  // ----------------------------------------------------------- ES|QL visitors

  visitCommand?: (
    node: types.ESQLCommand,
    parent: types.ESQLAstQueryExpression | undefined,
    walker: WalkerVisitorApi
  ) => void;
  visitHeaderCommand?: (
    node: types.ESQLAstHeaderCommand,
    parent: types.ESQLAstQueryExpression | undefined,
    walker: WalkerVisitorApi
  ) => void;
  visitCommandOption?: (
    node: types.ESQLCommandOption,
    parent: types.ESQLCommand | undefined,
    walker: WalkerVisitorApi
  ) => void;
  visitQuery?: (
    node: types.ESQLAstQueryExpression,
    parent: types.ESQLProperNode | undefined,
    walker: WalkerVisitorApi
  ) => void;
  visitFunction?: (
    node: types.ESQLFunction,
    parent: types.ESQLProperNode | undefined,
    walker: WalkerVisitorApi
  ) => void;
  visitSource?: (
    node: types.ESQLSource,
    parent: types.ESQLProperNode | undefined,
    walker: WalkerVisitorApi
  ) => void;
  visitColumn?: (
    node: types.ESQLColumn,
    parent: types.ESQLProperNode | undefined,
    walker: WalkerVisitorApi
  ) => void;
  visitOrder?: (
    node: types.ESQLOrderExpression,
    parent: types.ESQLProperNode | undefined,
    walker: WalkerVisitorApi
  ) => void;
  visitLiteral?: (
    node: types.ESQLLiteral,
    parent: types.ESQLProperNode | undefined,
    walker: WalkerVisitorApi
  ) => void;
  visitListLiteral?: (
    node: types.ESQLList,
    parent: types.ESQLProperNode | undefined,
    walker: WalkerVisitorApi
  ) => void;
  visitInlineCast?: (
    node: types.ESQLInlineCast,
    parent: types.ESQLProperNode | undefined,
    walker: WalkerVisitorApi
  ) => void;
  visitUnknown?: (
    node: types.ESQLUnknownItem,
    parents: types.ESQLProperNode | undefined,
    walker: WalkerVisitorApi
  ) => void;
  visitIdentifier?: (
    node: types.ESQLIdentifier,
    parent: types.ESQLProperNode | undefined,
    walker: WalkerVisitorApi
  ) => void;
  visitMap?: (
    node: types.ESQLMap,
    parent: types.ESQLProperNode | undefined,
    walker: WalkerVisitorApi
  ) => void;
  visitMapEntry?: (
    node: types.ESQLMapEntry,
    parent: types.ESQLProperNode | undefined,
    walker: WalkerVisitorApi
  ) => void;
  visitParens?: (
    node: types.ESQLParens,
    parent: types.ESQLProperNode | undefined,
    walker: WalkerVisitorApi
  ) => void;

  // ------------------------------------------------------------ Other options

  /**
   * Called on every expression node.
   *
   * @todo Rename to `visitExpression`.
   */
  visitSingleAstItem?: (
    node: types.ESQLAstExpression,
    parent: types.ESQLProperNode | undefined,
    walker: WalkerVisitorApi
  ) => void;

  /**
   * Called for any node type that does not have a specific visitor.
   *
   * @param node Any valid AST node.
   */
  visitAny?: (
    node: types.ESQLProperNode,
    parent: types.ESQLProperNode | undefined,
    walker: WalkerVisitorApi
  ) => void;

  /**
   * Order in which to traverse child nodes. If set to 'forward', child nodes
   * are traversed in the order they appear in the AST. If set to 'backward',
   * child nodes are traversed in reverse order.
   *
   * @default 'forward'
   */
  order?: 'forward' | 'backward';

  /**
   * If true, skip traversal of header commands (e.g., SET statements).
   * This allows processing only the main query commands without the header.
   *
   * @default false
   */
  skipHeader?: boolean;
}

export type WalkerAstNode = types.ESQLAstNode | types.ESQLAstNode[];

export type WalkerVisitorApi = Pick<Walker, 'abort'>;

/**
 * Iterates over all nodes in the AST and calls the appropriate visitor
 * functions.
 */
export class Walker {
  /**
   * Walks the AST and calls the appropriate visitor functions.
   */
  public static readonly walk = (tree: WalkerAstNode, options: WalkerOptions): Walker => {
    const walker = new Walker(options);
    walker.walk(tree);
    return walker;
  };

  /**
   * Finds and returns the first node that matches the search criteria.
   *
   * @param tree AST node to start the search from.
   * @param predicate A function that returns true if the node matches the search criteria.
   * @returns The first node that matches the search criteria.
   */
  public static readonly find = (
    tree: WalkerAstNode,
    predicate: (node: types.ESQLProperNode) => boolean,
    options?: WalkerOptions
  ): types.ESQLProperNode | undefined => {
    let found: types.ESQLProperNode | undefined;
    Walker.walk(tree, {
      ...options,
      visitAny: (node, parent, walker) => {
        if (!found && predicate(node)) {
          found = node;
          walker.abort();
        }
      },
    });
    return found;
  };

  /**
   * Finds and returns all nodes that match the search criteria.
   *
   * @param tree AST node to start the search from.
   * @param predicate A function that returns true if the node matches the search criteria.
   * @returns All nodes that match the search criteria.
   */
  public static readonly findAll = (
    tree: WalkerAstNode,
    predicate: (node: types.ESQLProperNode) => boolean,
    options?: WalkerOptions
  ): types.ESQLProperNode[] => {
    const list: types.ESQLProperNode[] = [];
    Walker.walk(tree, {
      ...options,
      visitAny: (node) => {
        if (predicate(node)) {
          list.push(node);
        }
      },
    });
    return list;
  };

  /**
   * Matches a single node against a template object. Returns the first node
   * that matches the template. The *template* object is a sparse representation
   * of the node structure, where each property corresponds to a node type or
   * property to match against.
   *
   * - An array matches if the node key is in the array.
   * - A RegExp matches if the node key matches the RegExp.
   * - Any other value matches if the node key is triple-equal to the value.
   *
   * For example, match the first `literal`:
   *
   * ```typescript
   * const literal = Walker.match(ast, { type: 'literal' });
   * ```
   *
   * Find the first `literal` with a specific value:
   *
   * ```typescript
   * const number42 = Walker.match(ast, { type: 'literal', value: 42 });
   * ```
   *
   * Find the first literal of type `integer` or `decimal`:
   *
   * ```typescript
   * const number = Walker.match(ast, {
   *   type: 'literal',
   *   literalType: [ 'integer', 'decimal' ],
   * });
   * ```
   *
   * Finally, you can also match any field by regular expression. Find
   * the first `source` AST node, which has "log" in its name:
   *
   * ```typescript
   * const logSource = Walker.match(ast, { type: 'source', name: /.+log.+/ });
   * ```
   *
   * @param tree AST node to match against the template.
   * @param template Template object to match against the node.
   * @returns The first node that matches the template
   */
  public static readonly match = (
    tree: WalkerAstNode,
    template: NodeMatchTemplate,
    options?: WalkerOptions
  ): types.ESQLProperNode | undefined => {
    const predicate = templateToPredicate(template);
    return Walker.find(tree, predicate, options);
  };

  /**
   * Matches all nodes against a template object. Returns all nodes that match
   * the template.
   *
   * @param tree AST node to match against the template.
   * @param template Template object to match against the node.
   * @returns All nodes that match the template
   */
  public static readonly matchAll = (
    tree: WalkerAstNode,
    template: NodeMatchTemplate,
    options?: WalkerOptions
  ): types.ESQLProperNode[] => {
    const predicate = templateToPredicate(template);
    return Walker.findAll(tree, predicate, options);
  };

  /**
   * Replaces a single node in the AST with a new value. Replaces the first
   * node that matches the template with the new value. Replacement happens
   * in-place, so the original AST is modified.
   *
   * For example, replace "?my_param" parameter with an inlined string literal:
   *
   * ```typescript
   * Walker.replace(ast,
   *  { type: 'literal', literalType: 'param', paramType: 'named',
   *      value: 'my_param' },
   *  Builder.expression.literal.string('This is my string'));
   * ```
   *
   * @param tree AST node to search in.
   * @param matcher A function or template object to match against the node.
   * @param newValue The new value to replace the matched node.
   * @returns The updated node, if a match was found and replaced.
   */
  public static readonly replace = (
    tree: WalkerAstNode,
    matcher: NodeMatchTemplate | ((node: types.ESQLProperNode) => boolean),
    newValue: types.ESQLProperNode | ((node: types.ESQLProperNode) => types.ESQLProperNode)
  ): types.ESQLProperNode | undefined => {
    const node =
      typeof matcher === 'function' ? Walker.find(tree, matcher) : Walker.match(tree, matcher);
    if (!node) return;
    const replacement = typeof newValue === 'function' ? newValue(node) : newValue;
    replaceProperties(node, replacement);
    return node;
  };

  /**
   * Replaces all nodes in the AST that match the given template with the new
   * value. Works same as {@link Walker.replace}, but replaces all matching nodes.
   *
   * @param tree AST node to search in.
   * @param matcher A function or template object to match against the node.
   * @param newValue The new value to replace the matched nodes.
   * @returns The updated nodes, if any matches were found and replaced.
   */
  public static readonly replaceAll = (
    tree: WalkerAstNode,
    matcher: NodeMatchTemplate | ((node: types.ESQLProperNode) => boolean),
    newValue: types.ESQLProperNode | ((node: types.ESQLProperNode) => types.ESQLProperNode)
  ): types.ESQLProperNode[] => {
    const nodes =
      typeof matcher === 'function'
        ? Walker.findAll(tree, matcher)
        : Walker.matchAll(tree, matcher);
    if (nodes.length === 0) return [];
    for (const node of nodes) {
      const replacement = typeof newValue === 'function' ? newValue(node) : newValue;
      replaceProperties(node, replacement);
    }
    return nodes;
  };

  /**
   * Walks the AST and extracts all command statements.
   *
   * @param tree AST node to extract parameters from.
   */
  public static readonly commands = (tree: Node, options?: WalkerOptions): types.ESQLCommand[] => {
    return Walker.matchAll(tree, { type: 'command' }, options) as types.ESQLCommand[];
  };

  /**
   * Walks the AST and extracts all parameter literals.
   *
   * @param tree AST node to extract parameters from.
   */
  public static readonly params = (
    tree: WalkerAstNode,
    options?: WalkerOptions
  ): types.ESQLParamLiteral[] => {
    return Walker.matchAll(
      tree,
      {
        type: 'literal',
        literalType: 'param',
      },
      options
    ) as types.ESQLParamLiteral[];
  };

  /**
   * Finds the first function that matches the predicate.
   *
   * @param tree AST node from which to search for a function
   * @param predicateOrName Callback to determine if the function is found or
   *     a string with the function name.
   * @returns The first function that matches the predicate
   */
  public static readonly findFunction = (
    tree: WalkerAstNode,
    predicateOrName: ((node: types.ESQLFunction) => boolean) | string
  ): types.ESQLFunction | undefined => {
    let found: types.ESQLFunction | undefined;
    const predicate =
      typeof predicateOrName === 'string'
        ? (node: types.ESQLFunction) => node.name === predicateOrName
        : predicateOrName;
    Walker.walk(tree, {
      visitFunction: (func, parent, walker) => {
        if (!found && predicate(func)) {
          found = func;
          walker.abort();
        }
      },
    });
    return found;
  };

  /**
   * Searches for at least one occurrence of a function by name.
   *
   * @param tree AST subtree to search in.
   * @param name Function or expression name to search for.
   * @returns True if the function or expression is found in the AST.
   */
  public static readonly hasFunction = (tree: WalkerAstNode, name: string): boolean => {
    return !!Walker.findFunction(tree, name);
  };

  /**
   * Returns the parent node of the given child node.
   *
   * For example, if the child node is a source node, this method will return
   * the `FROM` command that contains the source:
   *
   * ```typescript
   * const { ast } = EsqlQuery.fromSrc('FROM index');
   * const child = Walker.match(ast, { type: 'source' });
   * const parent = Walker.parent(ast, child); // FROM
   * const grandParent = Walker.parent(ast, parent); // query expression
   * ```
   *
   * @param child The child node for which to find the parent.
   * @returns The parent node of the child, if found.
   */
  public static readonly parent = (
    tree: WalkerAstNode,
    child: types.ESQLProperNode
  ): types.ESQLProperNode | undefined => {
    let found: types.ESQLProperNode | undefined;
    Walker.walk(tree, {
      visitAny: (node, parent, walker) => {
        if (node === child) {
          found = parent;
          walker.abort();
        }
      },
    });
    return found;
  };

  /**
   * Returns an array of parent nodes for the given child node.
   * This method traverses the AST upwards from the child node
   * and collects all parent nodes until it reaches the root. The
   * most immediate parent is the first element in the array,
   * and the root node is the last element.
   *
   * @param tree AST node to search in.
   * @param child The child node for which to find the parents.
   * @returns An array of parent nodes for the child, if found.
   */
  public static readonly parents = (
    tree: WalkerAstNode,
    child: types.ESQLProperNode
  ): types.ESQLProperNode[] => {
    const ancestry: types.ESQLProperNode[] = [];
    while (true) {
      const parent = Walker.parent(tree, child);
      if (!parent) break;
      ancestry.push(parent);
      child = parent;
    }
    return ancestry;
  };

  /**
   * Visits all comment nodes in the AST. Comments are part of the *hidden*
   * channel and normally not part of the AST. To parse the comments, you
   * need to run the parser with `withFormatting` option set to `true`.
   *
   * @param tree AST node to search in.
   * @param callback Callback function that is called for each comment node.
   *     The callback receives the comment node, the node it is attached to,
   *     and the attachment type (top, left, right, rightSingleLine, bottom).
   */
  public static readonly visitComments = (
    tree: WalkerAstNode,
    callback: (
      comment: types.ESQLAstComment,
      node: types.ESQLProperNode,
      attachment: keyof types.ESQLAstNodeFormatting
    ) => void
  ): void => {
    Walker.walk(tree, {
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

  /**
   * Visits all nodes in the AST.
   *
   * @param tree AST node to walk.
   * @param visitAny Callback function to call for each node.
   * @param options Additional options for the walker.
   */
  public static visitAny = (
    tree: WalkerAstNode,
    visitAny: WalkerOptions['visitAny'],
    options?: WalkerOptions
  ): void => {
    Walker.walk(tree, { ...options, visitAny });
  };

  protected aborted: boolean = false;

  constructor(protected readonly options: WalkerOptions) {}

  public abort(): void {
    this.aborted = true;
  }

  public walk(
    tree: WalkerAstNode | undefined,
    parent: types.ESQLProperNode | undefined = undefined
  ): void {
    if (this.aborted) return;
    if (!tree) return;
    if (Array.isArray(tree)) {
      this.walkList(tree, parent);
    } else if (tree.type === 'command') {
      this.walkCommand(
        tree as types.ESQLAstCommand,
        parent as types.ESQLAstQueryExpression | undefined
      );
    } else if (tree.type === 'header-command') {
      this.walkHeaderCommand(
        tree as types.ESQLAstHeaderCommand,
        parent as types.ESQLAstQueryExpression | undefined
      );
    } else {
      this.walkExpression(tree as types.ESQLAstExpression, parent);
    }
  }

  protected walkList(list: types.ESQLAstNode[], parent: types.ESQLProperNode | undefined): void {
    if (this.aborted) return;

    const { options } = this;
    const length = list.length;

    if (options.order === 'backward') {
      for (let i = length - 1; i >= 0; i--) {
        this.walk(list[i], parent);
      }
    } else {
      for (let i = 0; i < length; i++) {
        this.walk(list[i], parent);
      }
    }
  }

  public walkCommand(
    node: types.ESQLAstCommand,
    parent: types.ESQLAstQueryExpression | undefined
  ): void {
    if (this.aborted) return;

    const { options } = this;
    (options.visitCommand ?? options.visitAny)?.(node, parent, this);
    this.walkList(node.args, node);
  }

  public walkHeaderCommand(
    node: types.ESQLAstHeaderCommand,
    parent: types.ESQLAstQueryExpression | undefined
  ): void {
    if (this.aborted) return;

    const { options } = this;
    (options.visitHeaderCommand ?? options.visitAny)?.(node, parent, this);
    this.walkList(node.args, node);
  }

  public walkOption(node: types.ESQLCommandOption, parent: types.ESQLCommand | undefined): void {
    const { options } = this;
    (options.visitCommandOption ?? options.visitAny)?.(node, parent, this);
    this.walkList(node.args, node);
  }

  public walkExpression(
    node: types.ESQLAstItem | types.ESQLAstExpression,
    parent: types.ESQLProperNode | undefined = undefined
  ): void {
    if (Array.isArray(node)) {
      const list = node as types.ESQLAstItem[];
      this.walkList(list, parent);
    } else {
      const item = node as types.ESQLSingleAstItem;
      this.walkSingleAstItem(item, parent);
    }
  }

  public walkListLiteral(node: types.ESQLList, parent: types.ESQLProperNode | undefined): void {
    const { options } = this;
    (options.visitListLiteral ?? options.visitAny)?.(node, parent, this);
    this.walkList(node.values, node);
  }

  public walkSource(node: types.ESQLSource, parent: types.ESQLProperNode | undefined): void {
    const { options } = this;

    (options.visitSource ?? options.visitAny)?.(node, parent, this);

    const children: types.ESQLStringLiteral[] = [];

    if (node.prefix) {
      children.push(node.prefix);
    }
    if (node.index) {
      children.push(node.index);
    }
    if (node.selector) {
      children.push(node.selector);
    }

    this.walkList(children, node);
  }

  public walkColumn(node: types.ESQLColumn, parent: types.ESQLProperNode | undefined): void {
    const { options } = this;
    const { args } = node;

    (options.visitColumn ?? options.visitAny)?.(node, parent, this);

    if (args) {
      this.walkList(args, node);
    }
  }

  public walkOrder(
    node: types.ESQLOrderExpression,
    parent: types.ESQLProperNode | undefined
  ): void {
    const { options } = this;

    (options.visitOrder ?? options.visitAny)?.(node, parent, this);

    this.walkList(node.args, node);
  }

  public walkInlineCast(
    node: types.ESQLInlineCast,
    parent: types.ESQLProperNode | undefined
  ): void {
    const { options } = this;
    (options.visitInlineCast ?? options.visitAny)?.(node, parent, this);
    this.walkExpression(node.value, node);
  }

  public walkFunction(
    node: types.ESQLFunction,
    parent: types.ESQLProperNode | undefined = undefined
  ): void {
    const { options } = this;
    (options.visitFunction ?? options.visitAny)?.(node, parent, this);

    if (node.operator) this.walkSingleAstItem(node.operator, node);

    this.walkList(node.args, node);
  }

  public walkMap(node: types.ESQLMap, parent: types.ESQLProperNode | undefined): void {
    const { options } = this;
    (options.visitMap ?? options.visitAny)?.(node, parent, this);
    this.walkList(node.entries, node);
  }

  public walkMapEntry(node: types.ESQLMapEntry, parent: types.ESQLProperNode | undefined): void {
    const { options } = this;

    (options.visitMapEntry ?? options.visitAny)?.(node, parent, this);

    if (options.order === 'backward') {
      this.walkSingleAstItem(resolveItem(node.value), node);
      this.walkSingleAstItem(resolveItem(node.key), node);
    } else {
      this.walkSingleAstItem(resolveItem(node.key), node);
      this.walkSingleAstItem(resolveItem(node.value), node);
    }
  }

  public walkParens(node: types.ESQLParens, parent: types.ESQLProperNode | undefined): void {
    const { options } = this;
    (options.visitParens ?? options.visitAny)?.(node, parent, this);

    if (node.child) {
      this.walkSingleAstItem(node.child, node);
    }
  }

  public walkQuery(
    node: types.ESQLAstQueryExpression,
    parent: types.ESQLProperNode | undefined
  ): void {
    const { options } = this;
    (options.visitQuery ?? options.visitAny)?.(node, parent, this);

    if (node.header && !options.skipHeader) {
      this.walkList(node.header, node);
    }

    this.walkList(node.commands, node);
  }

  /**
   * Walk a PromQL AST node and dispatch to the appropriate walk method.
   */
  public walkPromqlNode(
    node: promql.PromQLAstNode,
    parent: types.ESQLProperNode | undefined
  ): void {
    if (this.aborted) return;
    if (!node) return;

    const walker = PromqlWalker.walk(
      node,
      {
        order: this.options.order,
        ...this.options.promql,
      },
      parent
    );

    if (walker.aborted) {
      this.abort();
    }
  }

  public walkSingleAstItem(
    node: types.ESQLAstExpression,
    parent: types.ESQLProperNode | undefined
  ): void {
    if (this.aborted) return;
    if (!node) return;

    // Check if this is a PromQL node and delegate to PromQL walker
    if (isPromqlNode(node)) {
      this.walkPromqlNode(node, parent);
      return;
    }

    // Skip other non-ES|QL dialect nodes
    if ('dialect' in node) return;

    const { options } = this;
    options.visitSingleAstItem?.(node, parent, this);
    switch (node.type) {
      case 'query': {
        this.walkQuery(node as types.ESQLAstQueryExpression, parent);
        break;
      }
      case 'function': {
        this.walkFunction(node as types.ESQLFunction, parent);
        break;
      }
      case 'map': {
        this.walkMap(node as types.ESQLMap, parent);
        break;
      }
      case 'map-entry': {
        this.walkMapEntry(node as types.ESQLMapEntry, parent);
        break;
      }
      case 'option': {
        this.walkOption(node, parent as types.ESQLCommand | undefined);
        break;
      }
      case 'source': {
        this.walkSource(node, parent);
        break;
      }
      case 'column': {
        this.walkColumn(node, parent);
        break;
      }
      case 'order': {
        this.walkOrder(node, parent);
        break;
      }
      case 'literal': {
        (options.visitLiteral ?? options.visitAny)?.(node, parent, this);
        break;
      }
      case 'list': {
        this.walkListLiteral(node, parent);
        break;
      }
      case 'inlineCast': {
        this.walkInlineCast(node, parent);
        break;
      }
      case 'parens': {
        this.walkParens(node as types.ESQLParens, parent);
        break;
      }
      case 'identifier': {
        (options.visitIdentifier ?? options.visitAny)?.(node, parent, this);
        break;
      }
      case 'unknown': {
        (options.visitUnknown ?? options.visitAny)?.(node, parent, this);
        break;
      }
    }
  }
}

export const walk = Walker.walk;
