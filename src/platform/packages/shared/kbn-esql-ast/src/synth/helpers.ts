/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Builder } from '../builder';
import { Walker, WalkerAstNode } from '../walker/walker';
import { BasicPrettyPrinter } from '../pretty_print';
import type { ESQLProperNode } from '../types';
import type { SynthGenerator, SynthMethod, SynthTaggedTemplateWithOpts } from './types';
import type { ParseOptions } from '../parser';

const serialize = (node: ESQLProperNode): string => {
  return node.type === 'command'
    ? BasicPrettyPrinter.command(node)
    : BasicPrettyPrinter.expression(node);
};

/**
 * This is used as a prototype of AST nodes created by the synth methods.
 * It implements the `toString` method, which is invoked when the node is
 * coerced to a string. So you can easily convert the node to a string by
 * calling `String(node)` or `${node}`:
 *
 * ```js
 * const node = expr`a.b`;  // { type: 'column', name: 'a.b' }
 * String(node)             // 'a.b'
 * ```
 */
export class SynthNode {
  toString(this: ESQLProperNode) {
    return serialize(this);
  }
}

export const makeSynthNode = (ast: WalkerAstNode) => {
  // Add SynthNode prototype to the AST node.
  Object.setPrototypeOf(ast, new SynthNode());

  // Remove parser generated fields.
  Walker.walk(ast, {
    visitAny: (node) => {
      Object.assign(node, Builder.parserFields({}));
    },
  });
};

export const createSynthMethod = <N extends ESQLProperNode>(
  generator: SynthGenerator<N>
): SynthMethod<N> => {
  const templateStringTag: SynthTaggedTemplateWithOpts<N> = ((opts?: ParseOptions) => {
    return (template: TemplateStringsArray, ...params: Array<N | string>) => {
      let src = '';
      const length = template.length;
      for (let i = 0; i < length; i++) {
        src += template[i];
        if (i < params.length) {
          const param = params[i];
          if (typeof param === 'string') src += param;
          else src += serialize(param);
        }
      }
      return generator(src, opts);
    };
  }) as SynthTaggedTemplateWithOpts<N>;

  const method: SynthMethod<N> = ((...args) => {
    const [first] = args;

    /**
     * Usage as function:
     *
     * ```js
     * expr('42');
     * ```
     */
    if (typeof first === 'string') return generator(first, args[1] as ParseOptions);

    /**
     * Usage as tagged template:
     *
     * ```js
     * expr`42`;
     * ```
     */
    if (Array.isArray(first)) {
      return templateStringTag()(
        first as unknown as TemplateStringsArray,
        ...(args as any).slice(1)
      );
    }

    /**
     * Usage as tagged template, with ability to specify parsing options:
     *
     * ```js
     * expr({ withFormatting: false })`42`;
     * ```
     */
    return templateStringTag(args[0] as ParseOptions);
  }) as SynthMethod<N>;

  return method;
};
