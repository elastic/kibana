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
  ESQLAstMetricsCommand,
  ESQLAstNode,
  ESQLFunction,
  ESQLSingleAstItem,
} from '../..';

export interface WalkerOptions {
  visitSingleAstItem?: (node: ESQLSingleAstItem) => void;
  visitFunction?: (node: ESQLFunction) => void;
}

export class Walker {
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
      case 'metrics': {
        const metrics = node as ESQLAstMetricsCommand;
        this.walk(metrics.sources);
        this.walk(metrics.aggregates);
        this.walk(metrics.grouping);
        break;
      }
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

export const walk = (node: ESQLAstNode | ESQLAstNode[], options: WalkerOptions): Walker => {
  const walker = new Walker(options);
  walker.walk(node);
  return walker;
};
