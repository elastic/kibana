/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import OriginalHandlebars from 'handlebars';
// @ts-expect-error Could not find a declaration file for module
import { resultIsAllowed } from 'handlebars/dist/cjs/handlebars/internal/proto-access';
// @ts-expect-error Could not find a declaration file for module
import AST from 'handlebars/dist/cjs/handlebars/compiler/ast';
// @ts-expect-error Could not find a declaration file for module
import { indexOf } from 'handlebars/dist/cjs/handlebars/utils';
// @ts-expect-error Could not find a declaration file for module
import { moveHelperToHooks } from 'handlebars/dist/cjs/handlebars/helpers';
import get from 'lodash/get';

export type ExtendedCompileOptions = Pick<
  CompileOptions,
  'knownHelpers' | 'knownHelpersOnly' | 'strict' | 'noEscape'
>;
export type ExtendedRuntimeOptions = Pick<RuntimeOptions, 'helpers'>;

// eslint-disable-next-line @typescript-eslint/no-namespace
export declare namespace ExtendedHandlebars {
  export function compileAST(
    template: string,
    options?: ExtendedCompileOptions
  ): (context: any, options?: ExtendedRuntimeOptions) => string;
  export function create(): typeof Handlebars; // eslint-disable-line @typescript-eslint/no-shadow
}

const originalCreate = OriginalHandlebars.create;
const Handlebars: typeof ExtendedHandlebars & typeof OriginalHandlebars = OriginalHandlebars as any;

// I've not been able to successfully re-export all of Handlebars, so for now we just re-export the features that we use.
// The handlebars module uses `export =`, so it can't be re-exported using `export *`. However, because of Babel, we're not allowed to use `export =` ourselves.
// Similarly we should technically be using `import OriginalHandlebars = require('handlebars')` above, but again, Babel will not allow this.
export default Handlebars; // eslint-disable-line import/no-default-export
export type { HelperDelegate, HelperOptions } from 'handlebars';

export function create(): typeof Handlebars {
  const SandboxedHandlebars = originalCreate.call(Handlebars) as typeof Handlebars;
  // When creating new Handlebars environments, ensure the custom compileAST function is present in the new environment as well
  SandboxedHandlebars.compileAST = Handlebars.compileAST;
  return SandboxedHandlebars;
}

Handlebars.create = create;

// Custom function to compile only the AST so we don't have to use `eval`
Handlebars.compileAST = function (template: string, options?: ExtendedCompileOptions) {
  const visitor = new ElasticHandlebarsVisitor(template, options, this.helpers);
  return (context: any, runtimeOptions?: ExtendedRuntimeOptions) =>
    visitor.render(context, runtimeOptions);
};

interface Container {
  helpers: { [name: string]: Handlebars.HelperDelegate };
  strict: (obj: { [name: string]: any }, name: string, loc: hbs.AST.SourceLocation) => any;
  lookupProperty: (parent: { [name: string]: any }, propertyName: string) => any;
  lambda: (current: any, context: any) => any;
  hooks: {
    helperMissing?: Handlebars.HelperDelegate;
    blockHelperMissing?: Handlebars.HelperDelegate;
  };
}

class ElasticHandlebarsVisitor extends Handlebars.Visitor {
  private scopes: any[] = [];
  private output: any[] = [];
  private template: string;
  private compileOptions: ExtendedCompileOptions;
  private ast?: hbs.AST.Program;
  private container: Container;
  // @ts-expect-error
  private defaultHelperOptions: Handlebars.HelperOptions = {};

  constructor(
    template: string,
    options: ExtendedCompileOptions = {},
    helpers: { [name: string]: Handlebars.HelperDelegate }
  ) {
    super();
    this.template = template;
    this.compileOptions = options;

    const container: Container = (this.container = {
      helpers: Object.assign({}, helpers),
      strict(obj, name, loc) {
        if (!obj || !(name in obj)) {
          throw new Handlebars.Exception('"' + name + '" not defined in ' + obj, {
            loc,
          } as hbs.AST.Node);
        }
        return container.lookupProperty(obj, name);
      },
      // this function is lifted from the handlebars source and slightly modified (lib/handlebars/runtime.js)
      lookupProperty(parent, propertyName) {
        const result = parent[propertyName];
        if (result == null) {
          return result;
        }
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return result;
        }

        if (resultIsAllowed(result, {}, propertyName)) {
          return result;
        }
        return undefined;
      },
      // this function is lifted from the handlebars source and slightly modified (lib/handlebars/runtime.js)
      lambda(current, context) {
        return typeof current === 'function' ? current.call(context) : current;
      },
      hooks: {},
    });

    const keepHelperInHelpers = false;
    moveHelperToHooks(container, 'helperMissing', keepHelperInHelpers);
    moveHelperToHooks(container, 'blockHelperMissing', keepHelperInHelpers);

    // @ts-expect-error
    this.defaultHelperOptions.lookupProperty = container.lookupProperty;
  }

  render(context: any, options: ExtendedRuntimeOptions = {}): string {
    this.scopes = [context];
    this.output = [];
    this.container.helpers = Object.assign(this.container.helpers, options.helpers);

    if (!this.ast) {
      this.ast = Handlebars.parse(this.template); // TODO: can we get away with using parseWithoutProcessing instead?
    }

    this.accept(this.ast);

    return this.output.join('');
  }

  MustacheStatement(mustache: hbs.AST.MustacheStatement) {
    // @ts-expect-error Calling SubExpression with a MustacheStatement doesn't seem right, but it's what handlebars does, so we do too
    this.SubExpression(mustache);
  }

  SubExpression(sexpr: hbs.AST.SubExpression) {
    transformLiteralToPath(sexpr);

    switch (this.classifySexpr(sexpr)) {
      case 'simple':
        this.simpleSexpr(sexpr);
        break;
      case 'helper':
        this.helperSexpr(sexpr);
        break;
      default:
        this.ambiguousSexpr(sexpr);
    }
  }

  // Liftet from lib/handlebars/compiler/compiler.js
  private classifySexpr(sexpr: { path: hbs.AST.PathExpression }) {
    const isSimple = AST.helpers.simpleId(sexpr.path);

    // a mustache is an eligible helper if:
    // * its id is simple (a single part, not `this` or `..`)
    let isHelper = AST.helpers.helperExpression(sexpr);

    // if a mustache is an eligible helper but not a definite
    // helper, it is ambiguous, and will be resolved in a later
    // pass or at runtime.
    let isEligible = isHelper || isSimple;

    // if ambiguous, we can possibly resolve the ambiguity now
    // An eligible helper is one that does not have a complex path, i.e. `this.foo`, `../foo` etc.
    if (isEligible && !isHelper) {
      const name = sexpr.path.parts[0];
      const options = this.compileOptions;
      if (options.knownHelpers && options.knownHelpers[name]) {
        isHelper = true;
      } else if (options.knownHelpersOnly) {
        isEligible = false;
      }
    }

    if (isHelper) {
      return 'helper';
    } else if (isEligible) {
      return 'ambiguous';
    } else {
      return 'simple';
    }
  }

  private simpleSexpr(sexpr: hbs.AST.SubExpression | hbs.AST.BlockStatement) {
    const path = sexpr.path;
    this.accept(path);
  }

  private helperSexpr(sexpr: hbs.AST.SubExpression | hbs.AST.BlockStatement) {
    const path = sexpr.path;
    const name = path.parts[0];

    if (this.compileOptions.knownHelpers && this.compileOptions.knownHelpers[name]) {
      this.invokeKnownHelper(sexpr, name);
    } else if (this.compileOptions.knownHelpersOnly) {
      // TODO: Ensure knownHelpers array is pre-populated with built in helpers
      throw new Handlebars.Exception(
        'You specified knownHelpersOnly, but used the unknown helper ' + name,
        sexpr
      );
    } else {
      this.invokeHelper(sexpr, path.original); // TODO: Shoul this be `name` instead of `path.original`?
    }
  }

  // This operation is used when the helper is known to exist,
  // so a `helperMissing` fallback is not required.
  private invokeKnownHelper(sexpr: hbs.AST.SubExpression | hbs.AST.BlockStatement, name: string) {
    const helper = this.setupHelper(sexpr, name);

    const result = helper.fn.apply(helper.context, helper.params);

    this.output.push(result);
  }

  // Pops off the helper's parameters, invokes the helper,
  // and pushes the helper's return value onto the stack.
  //
  // If the helper is not found, `helperMissing` is called.
  private invokeHelper(sexpr: hbs.AST.SubExpression | hbs.AST.BlockStatement, name: string) {
    const helper = this.setupHelper(sexpr, name);
    helper.fn =
      helper.fn || (this.compileOptions.strict ? undefined : this.container.hooks.helperMissing);

    const result = helper.fn.apply(helper.context, helper.params);

    this.output.push(result);
  }

  private ambiguousSexpr(
    sexpr: hbs.AST.SubExpression | hbs.AST.BlockStatement,
    program?: hbs.AST.Program,
    inverse?: hbs.AST.Program
  ) {
    const path = sexpr.path;
    const name = path.parts[0];
    const isBlock = program != null || inverse != null;

    let result;

    if (isBlock) {
      const currentOutput = this.output;
      this.output = [];
      this.accept(path);
      result = this.output[0];
      this.output = currentOutput;
    } else {
      this.accept(path);
    }

    const invokeResult = this.invokeAmbiguous(sexpr, name);

    if (!isBlock) {
      this.output.push(invokeResult);
    }

    return result;
  }

  // This operation is used when an expression like `{{foo}}`
  // is provided, but we don't know at compile-time whether it
  // is a helper or a path.
  //
  // This operation emits more code than the other options,
  // and can be avoided by passing the `knownHelpers` and
  // `knownHelpersOnly` flags at compile-time.
  private invokeAmbiguous(sexpr: hbs.AST.SubExpression | hbs.AST.BlockStatement, name: string) {
    const helper = this.setupHelper(sexpr, name);

    if (!helper.fn) {
      if (this.compileOptions.strict) {
        helper.fn = this.container.strict(sexpr, name, sexpr.loc);
      } else {
        helper.fn =
          this.container.lookupProperty(sexpr, name) || this.container.hooks.helperMissing;
      }
    }

    const result =
      typeof helper.fn === 'function' ? helper.fn.apply(helper.context, helper.params) : helper.fn;

    return result;
  }

  private setupHelper(
    block: hbs.AST.SubExpression | hbs.AST.BlockStatement,
    helperName: string,
    blockHelper: boolean = false
  ) {
    return {
      fn: this.container.lookupProperty(this.container.helpers, helperName),
      context: this.scopes[0],
      params: this.setupHelperArgs(block, helperName, blockHelper),
    };
  }

  private setupHelperArgs(
    block: hbs.AST.SubExpression | hbs.AST.BlockStatement,
    helperName: string,
    blockHelper: boolean = false
  ): [...any[], Handlebars.HelperOptions] {
    if (blockHelper) {
      throw new Error('Not implemented!'); // TODO: Handle or remove this
    }
    return [...this.getParams(block), this.setupParams(block, helperName)];
  }

  private setupParams(
    block: hbs.AST.SubExpression | hbs.AST.BlockStatement,
    helperName: string
  ): Handlebars.HelperOptions {
    return Object.assign(
      {
        name: helperName,
        fn: (nextContext: any) => {
          this.scopes.unshift(nextContext);
          this.acceptKey(block, 'program');
          this.scopes.shift();
          return ''; // TODO: supposed to return a string
        },
        inverse: noop,
        hash: getHash(block),
      },
      this.defaultHelperOptions
    );
  }

  BlockStatement(block: hbs.AST.BlockStatement) {
    transformLiteralToPath(block);

    const program = block.program;
    const inverse = block.inverse;

    switch (this.classifySexpr(block)) {
      case 'helper':
        this.helperSexpr(block);
        break;
      case 'simple':
        this.simpleSexpr(block);
        break;
      default:
        const result = this.ambiguousSexpr(block, program, inverse);
        this.ambiguousBlockValue(block, result);
    }
  }

  private ambiguousBlockValue(block: hbs.AST.BlockStatement, result: any) {
    const name = block.path.parts[0];
    const helper = this.setupHelper(block, name);

    if (!helper.fn) {
      const options = helper.params[helper.params.length - 1];
      this.container.hooks.blockHelperMissing!.call(block, result, options);
    }
  }

  PathExpression(path: hbs.AST.PathExpression) {
    const context = this.scopes[path.depth];
    const value = path.parts[0] === undefined ? context : get(context, path.parts);
    if (this.compileOptions.noEscape === true || typeof value !== 'string') {
      this.output.push(value);
    } else {
      this.output.push(Handlebars.escapeExpression(value));
    }
  }

  ContentStatement(content: hbs.AST.ContentStatement) {
    this.output.push(content.value);
  }

  StringLiteral(string: hbs.AST.StringLiteral) {
    this.output.push(string.value);
  }

  NumberLiteral(number: hbs.AST.NumberLiteral) {
    this.output.push(number.value);
  }

  BooleanLiteral(bool: hbs.AST.BooleanLiteral) {
    this.output.push(bool.value);
  }

  UndefinedLiteral() {
    this.output.push('undefined');
  }

  NullLiteral() {
    this.output.push('null');
  }

  private getParams(block: { params: hbs.AST.Expression[] }): any[] {
    const currentOutput = this.output;
    this.output = [];
    this.acceptArray(block.params);
    const params = this.output;
    this.output = currentOutput;
    return params;
  }
}

function noop() {
  return '';
}

function getHash(statement: { hash?: hbs.AST.Hash }) {
  const result: { [key: string]: any } = {};
  if (!statement.hash) return result;
  for (const { key, value } of statement.hash.pairs) {
    result[key] = (
      value as hbs.AST.StringLiteral | hbs.AST.BooleanLiteral | hbs.AST.NumberLiteral
    ).value; // TODO: I'm not sure if value can be any other type
  }
  return result;
}

// liftet from handlebars lib/handlebars/compiler/compiler.js
function transformLiteralToPath(sexpr: { path: hbs.AST.PathExpression }) {
  if (!sexpr.path.parts) {
    const literal = sexpr.path;
    // Casting to string here to make false and 0 literal values play nicely with the rest
    // of the system.
    sexpr.path = {
      type: 'PathExpression',
      data: false,
      depth: 0,
      parts: [literal.original + ''],
      original: literal.original + '',
      loc: literal.loc,
    };
  }
}
