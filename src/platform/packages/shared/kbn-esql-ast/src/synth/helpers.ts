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
import { BasicPrettyPrinter, LeafPrinter } from '../pretty_print';
import type { ESQLProperNode } from '../types';
import type {
  SynthGenerator,
  SynthMethod,
  SynthTaggedTemplateWithOpts,
  SynthTemplateHole,
} from './types';
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

const holeToFragment = (hole: SynthTemplateHole): string => {
  switch (typeof hole) {
    case 'string': {
      return hole;
    }
    case 'number': {
      const isInteger = Math.round(hole) === hole;
      const node = isInteger
        ? Builder.expression.literal.integer(hole)
        : Builder.expression.literal.decimal(hole);

      return LeafPrinter.literal(node);
    }
    case 'object': {
      if (Array.isArray(hole)) {
        let list: string = '';

        for (const item of hole) {
          const serialized = typeof item === 'string' ? item : serialize(item);

          list += (list ? ', ' : '') + serialized;
        }

        return list;
      } else {
        return serialize(hole);
      }
    }
    default: {
      throw new Error(`Unexpected hole synth hole: ${JSON.stringify(hole)}`);
    }
  }
};

export const createSynthMethod = <N extends ESQLProperNode>(
  generator: SynthGenerator<N>
): SynthMethod<N> => {
  const templateStringTag: SynthTaggedTemplateWithOpts<N> = ((opts?: ParseOptions) => {
    return (template: TemplateStringsArray, ...holes: SynthTemplateHole[]) => {
      let src = '';
      const length = template.length;

      for (let i = 0; i < length; i++) {
        src += template[i];
        if (i < holes.length) {
          const hole = holes[i];
          const fragment = holeToFragment(hole);

          src += fragment;
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
