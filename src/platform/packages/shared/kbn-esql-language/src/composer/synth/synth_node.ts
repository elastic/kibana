/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Walker } from '../../ast/walker';
import { Builder } from '../../ast/builder';
import { BasicPrettyPrinter } from '../../pretty_print';
import { printAst, type PrintAstOptions } from '../../debug';
import type { ESQLProperNode } from '../../types';

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
  public static from<N extends ESQLProperNode>(node: N): N & SynthNode {
    // Remove parser generated fields.
    Walker.walk(node, {
      visitAny: (n) => {
        Object.assign(n, Builder.parserFields({}));
      },
    });

    node = Object.assign(new SynthNode(), node);

    return node as N & SynthNode;
  }

  toString(this: ESQLProperNode) {
    return BasicPrettyPrinter.print(this);
  }

  dump(this: ESQLProperNode, options?: PrintAstOptions) {
    return printAst(this, { location: false, ...options });
  }
}
