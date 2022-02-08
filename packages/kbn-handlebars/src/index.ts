/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import OriginalHandlebars from 'handlebars';
import get from 'lodash/get';

// eslint-disable-next-line @typescript-eslint/no-namespace
export declare namespace ExtendedHandlebars {
  export function compileAst(template: string): (context: any) => string;
  export function create(): typeof Handlebars; // eslint-disable-line @typescript-eslint/no-shadow
}

const originalCreate = OriginalHandlebars.create;
const Handlebars: typeof ExtendedHandlebars & typeof OriginalHandlebars = OriginalHandlebars as any;

// I've not been able to successfully re-export all of Handlebars, so for now we just re-export the features that we use.
// The handlebars module uses `export =`, so it can't be re-exported using `export *`. However, because of Babel, we're not allowed to use `export =` ourselves.
// Similarly we should technically be using `import OriginalHandlebars = require('handlebars')` above, but again, Babel will not allow this.
export default Handlebars; // eslint-disable-line import/no-default-export
export type { HelperDelegate, HelperOptions } from 'handlebars';

// When creating new Handlebars environments, ensure the custom compileAst function is present in the new environment as well
export function create(): typeof Handlebars {
  const SandboxedHandlebars = originalCreate.call(Handlebars) as typeof Handlebars;
  SandboxedHandlebars.compileAst = Handlebars.compileAst;
  return SandboxedHandlebars;
}

Handlebars.create = create;

// Custom function to compile only the AST so we don't have to use `eval`
Handlebars.compileAst = function (template: string) {
  const visitor = new ElasticHandlebarsVisitor(template, this.helpers);
  return (context: any) => visitor.render(context);
};

class ElasticHandlebarsVisitor extends Handlebars.Visitor {
  private scopes: any[] = [];
  private values: any[] = [];
  private helpers: { [name: string]: Handlebars.HelperDelegate };
  private ast: hbs.AST.Program;

  constructor(template: string, helpers: { [name: string]: Handlebars.HelperDelegate }) {
    super();
    this.ast = Handlebars.parse(template);
    this.helpers = helpers;
  }

  render(context: any): string {
    this.scopes = [context];
    this.values = [];
    this.accept(this.ast);
    return this.values.join('');
  }

  MustacheStatement(mustache: hbs.AST.MustacheStatement) {
    // @ts-expect-error
    this.SubExpression(mustache); // TODO: Calling SubExpression with a MustacheStatement doesn't seem right
  }

  SubExpression(sexpr: hbs.AST.SubExpression) {
    const name = sexpr.path.parts[0];
    const helper = this.helpers[name];

    if (helper) {
      const [context] = this.scopes;
      const params = this.getParams(sexpr);
      const result = helper.call(context, ...params, {
        hash: {}, // TODO: Figure out what actual value to put here
      });
      this.values.push(result);
      return;
    }

    super.SubExpression(sexpr);
  }

  BlockStatement(block: hbs.AST.BlockStatement) {
    const name = block.path.parts[0];
    const helper = this.helpers[name];

    if (!helper) {
      throw new Handlebars.Exception(`Unknown helper ${name}`, block);
    }

    const [context] = this.scopes;
    const params = this.getParams(block);
    const options = {
      fn: (nextContext: any) => {
        this.scopes.unshift(nextContext);
        this.acceptKey(block, 'program');
        this.scopes.shift();
      },
    };
    helper.call(context, ...params, options);
  }

  PathExpression(path: hbs.AST.PathExpression) {
    const context = this.scopes[path.depth];
    const value = path.parts[0] === undefined ? context : get(context, path.parts);
    this.values.push(value);
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
