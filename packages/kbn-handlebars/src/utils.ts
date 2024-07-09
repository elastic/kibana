/*
 * Elasticsearch B.V licenses this file to you under the MIT License.
 * See `packages/kbn-handlebars/LICENSE` for more information.
 */

// @ts-expect-error: Could not find a declaration file for module
import { createFrame } from 'handlebars/dist/cjs/handlebars/utils';

import type { AmbiguousHelperOptions, DecoratorOptions } from './types';

export function isBlock(node: hbs.AST.Node): node is hbs.AST.BlockStatement {
  return 'program' in node || 'inverse' in node;
}

export function isDecorator(
  node: hbs.AST.Node
): node is hbs.AST.Decorator | hbs.AST.DecoratorBlock {
  return node.type === 'Decorator' || node.type === 'DecoratorBlock';
}

export function toDecoratorOptions(options: AmbiguousHelperOptions) {
  // There's really no tests/documentation on this, but to match the upstream codebase we'll remove `lookupProperty` from the decorator context
  delete (options as any).lookupProperty;

  return options as DecoratorOptions;
}

export function noop() {
  return '';
}

// liftet from handlebars lib/handlebars/runtime.js
export function initData(context: any, data: any) {
  if (!data || !('root' in data)) {
    data = data ? createFrame(data) : {};
    data.root = context;
  }
  return data;
}

// liftet from handlebars lib/handlebars/compiler/compiler.js
export function transformLiteralToPath(node: { path: hbs.AST.PathExpression | hbs.AST.Literal }) {
  const pathIsLiteral = 'parts' in node.path === false;

  if (pathIsLiteral) {
    const literal = node.path;
    // @ts-expect-error: Not all `hbs.AST.Literal` sub-types has an `original` property, but that's ok, in that case we just want `undefined`
    const original = literal.original;
    // Casting to string here to make false and 0 literal values play nicely with the rest
    // of the system.
    node.path = {
      type: 'PathExpression',
      data: false,
      depth: 0,
      parts: [original + ''],
      original: original + '',
      loc: literal.loc,
    };
  }
}

export function allowUnsafeEval() {
  try {
    // Do not remove the `kbnUnsafeEvalTest` parameter.
    // It is used for filtering out expected CSP failures, and must be the first piece of content in this function.
    new Function('kbnUnsafeEvalTest', 'return true;');
    return true;
  } catch (e) {
    return false;
  }
}
