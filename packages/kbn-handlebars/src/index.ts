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
import get from 'lodash/get';

export type ExtendedCompileOptions = Pick<CompileOptions, 'noEscape'>;
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

class ElasticHandlebarsVisitor extends Handlebars.Visitor {
  private scopes: any[] = [];
  private output: any[] = [];
  private template: string;
  private compileOptions: ExtendedCompileOptions;
  private helpers: { [name: string]: Handlebars.HelperDelegate };
  private ast?: hbs.AST.Program;
  private defaultHelperOptions: Handlebars.HelperOptions = {
    // @ts-expect-error this function is lifted from the handlebars source and slightly modified (lib/handlebars/runtime.js)
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
  };
  private container: {
    helpers: { [name: string]: Handlebars.HelperDelegate };
  } = {
    helpers: {},
  };

  constructor(
    template: string,
    options: ExtendedCompileOptions = {},
    helpers: { [name: string]: Handlebars.HelperDelegate }
  ) {
    super();
    this.template = template;
    this.compileOptions = options;
    this.helpers = helpers;
  }

  render(context: any, options: ExtendedRuntimeOptions = {}): string {
    this.scopes = [context];
    this.output = [];
    this.container = {
      helpers: Object.assign({}, this.helpers, options.helpers),
    };

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

    const name = sexpr.path.parts[0];
    const helper = this.container.helpers[name];

    if (helper) {
      const [context] = this.scopes;
      const params = this.getParams(sexpr);
      const result = helper.call(
        context,
        ...params,
        Object.assign(
          {
            hash: getHash(sexpr),
          },
          this.defaultHelperOptions
        )
      );
      this.output.push(result);
      return;
    }

    super.SubExpression(sexpr);
  }

  BlockStatement(block: hbs.AST.BlockStatement) {
    transformLiteralToPath(block);

    const name = block.path.parts[0];
    const helper = this.container.helpers[name];

    if (!helper) {
      throw new Handlebars.Exception(`Unknown helper ${name}`, block);
    }

    const [context] = this.scopes;
    const params = this.getParams(block);
    const options: Handlebars.HelperOptions = {
      fn: (nextContext: any) => {
        this.scopes.unshift(nextContext);
        this.acceptKey(block, 'program');
        this.scopes.shift();
        return ''; // TODO: supposed to return a string
      },
      inverse: noop,
      hash: getHash(block),
    };
    helper.call(context, ...params, options);
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
