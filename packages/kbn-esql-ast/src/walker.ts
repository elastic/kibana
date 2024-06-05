/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { ESQLAstItem, ESQLAstNode, ESQLFunction, ESQLSingleAstItem } from './types';

export interface WalkerOptions {
  visitSingleAstItem?: (node: ESQLSingleAstItem) => void;
  visitFunction?: (node: ESQLFunction) => void;
}

export class Walker {
  constructor(protected readonly options: WalkerOptions) {}

  public walk(node: ESQLAstNode): void {
    // Special case for array "ast nodes", ideally we should remove this edge case in the future.
    if (node instanceof Array) {
      this.walkAstItem(node);
      return;
    }

    switch (node.name) {
      case 'command':
      case 'metrics': {
        throw new Error('Not implemented');
        break;
      }
      default: {
        this.walkAstItem(node as ESQLAstItem);
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
    this.options.visitSingleAstItem?.(node);
    switch (node.type) {
      case 'function': {
        this.walkFunction(node as ESQLFunction);
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

export const walk = (node: ESQLAstNode, options: WalkerOptions): Walker => {
  const walker = new Walker(options);
  walker.walk(node);
  return walker;
};
