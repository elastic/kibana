/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import OriginalHandlebars from 'handlebars';
// @ts-expect-error
import { resultIsAllowed } from 'handlebars/dist/cjs/handlebars/internal/proto-access';
import get from 'lodash/get';

export type ExtendedCompileOptions = Pick<CompileOptions, 'noEscape'>;

// eslint-disable-next-line @typescript-eslint/no-namespace
export declare namespace ExtendedHandlebars {
  export function compileAST(
    template: string,
    options?: ExtendedCompileOptions
  ): (context: any) => string;
  export function create(): typeof Handlebars; // eslint-disable-line @typescript-eslint/no-shadow
}

const originalCreate = OriginalHandlebars.create;
const Handlebars: typeof ExtendedHandlebars & typeof OriginalHandlebars = OriginalHandlebars as any;

// I've not been able to successfully re-export all of Handlebars, so for now we just re-export the features that we use.
// The handlebars module uses `export =`, so it can't be re-exported using `export *`. However, because of Babel, we're not allowed to use `export =` ourselves.
// Similarly we should technically be using `import OriginalHandlebars = require('handlebars')` above, but again, Babel will not allow this.
export default Handlebars; // eslint-disable-line import/no-default-export
export type { HelperDelegate, HelperOptions } from 'handlebars';

// When creating new Handlebars environments, ensure the custom compileAST function is present in the new environment as well
export function create(): typeof Handlebars {
  const SandboxedHandlebars = originalCreate.call(Handlebars) as typeof Handlebars;
  SandboxedHandlebars.compileAST = Handlebars.compileAST;
  return SandboxedHandlebars;
}

Handlebars.create = create;

// Custom function to compile only the AST so we don't have to use `eval`
Handlebars.compileAST = function (template: string, options?: ExtendedCompileOptions) {
  const visitor = new ElasticHandlebarsVisitor(template, options, this.helpers);
  return (context: any) => visitor.render(context);
};

class ElasticHandlebarsVisitor extends Handlebars.Visitor {
  private scopes: any[] = [];
  private values: any[] = [];
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

  render(context: any): string {
    this.scopes = [context];
    this.values = [];

    if (!this.ast) {
      this.ast = Handlebars.parse(this.template); // TODO: can we get away with using parseWithoutProcessing instead?
    }

    this.accept(this.ast);
    return this.values.join('');
  }

  MustacheStatement(mustache: hbs.AST.MustacheStatement) {
    // @ts-expect-error Calling SubExpression with a MustacheStatement doesn't seem right, but it's what handlebars does, so we do too
    this.SubExpression(mustache);
  }

  SubExpression(sexpr: hbs.AST.SubExpression) {
    transformLiteralToPath(sexpr);

    const name = sexpr.path.parts[0];
    const helper = this.helpers[name];

    if (helper) {
      const [context] = this.scopes;
      const params = this.getParams(sexpr);
      const result = helper.call(
        context,
        ...params,
        Object.assign(
          { hash: {} }, // TODO: Figure out what actual value to put in hash
          this.defaultHelperOptions
        )
      );
      this.values.push(result);
      return;
    }

    super.SubExpression(sexpr);
  }

  BlockStatement(block: hbs.AST.BlockStatement) {
    transformLiteralToPath(block);

    const name = block.path.parts[0];
    const helper = this.helpers[name];

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
      hash: {}, // TODO: Figure out what actual value to put in hash
    };
    helper.call(context, ...params, options);
  }

  PathExpression(path: hbs.AST.PathExpression) {
    const context = this.scopes[path.depth];
    const value = path.parts[0] === undefined ? context : get(context, path.parts);
    if (this.compileOptions.noEscape === true || typeof value !== 'string') {
      this.values.push(value);
    } else {
      this.values.push(Handlebars.escapeExpression(value));
    }
  }

  ContentStatement(content: hbs.AST.ContentStatement) {
    this.values.push(content.value);
  }

  StringLiteral(string: hbs.AST.StringLiteral) {
    this.values.push(string.value);
  }

  NumberLiteral(number: hbs.AST.NumberLiteral) {
    this.values.push(number.value);
  }

  BooleanLiteral(bool: hbs.AST.BooleanLiteral) {
    this.values.push(bool.value);
  }

  UndefinedLiteral() {
    this.values.push('undefined');
  }

  NullLiteral() {
    this.values.push('null');
  }

  getParams(block: { params: hbs.AST.Expression[] }): any[] {
    const currentValues = this.values;
    this.values = [];
    this.acceptArray(block.params);
    const params = this.values;
    this.values = currentValues;
    return params;
  }
}

function noop() {
  return '';
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
