/*
 * Elasticsearch B.V licenses this file to you under the MIT License.
 * See `packages/kbn-handlebars/LICENSE` for more information.
 */

// The handlebars module uses `export =`, so we should technically use `import Handlebars = require('handlebars')`, but Babel will not allow this:
// https://www.typescriptlang.org/docs/handbook/modules.html#export--and-import--require
import Handlebars from 'handlebars';

import type { ExtendedCompileOptions, ExtendedRuntimeOptions } from './types';
import { ElasticHandlebarsVisitor } from './visitor';

const originalCreate = Handlebars.create;

export { Handlebars };

/**
 * Creates an isolated Handlebars environment.
 *
 * Each environment has its own helpers.
 * This is only necessary for use cases that demand distinct helpers.
 * Most use cases can use the root Handlebars environment directly.
 *
 * @returns A sandboxed/scoped version of the @kbn/handlebars module
 */
Handlebars.create = function (): typeof Handlebars {
  const SandboxedHandlebars = originalCreate.call(Handlebars) as typeof Handlebars;
  // When creating new Handlebars environments, ensure the custom compileAST function is present in the new environment as well
  SandboxedHandlebars.compileAST = Handlebars.compileAST;
  return SandboxedHandlebars;
};

/**
 * Compiles the given Handlbars template without the use of `eval`.
 *
 * @returns A render function with the same API as the return value from the regular Handlebars `compile` function.
 */
Handlebars.compileAST = function (
  input: string | hbs.AST.Program,
  options?: ExtendedCompileOptions
) {
  if (input == null || (typeof input !== 'string' && input.type !== 'Program')) {
    throw new Handlebars.Exception(
      `You must pass a string or Handlebars AST to Handlebars.compileAST. You passed ${input}`
    );
  }

  // If `Handlebars.compileAST` is reassigned, `this` will be undefined.
  const visitor = new ElasticHandlebarsVisitor(this ?? Handlebars, input, options);

  return (context: any, runtimeOptions?: ExtendedRuntimeOptions) =>
    visitor.render(context, runtimeOptions);
};
