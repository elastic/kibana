/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import OriginalHandlebars from 'handlebars';
// @ts-expect-error: Could not find a declaration file for module
import { resultIsAllowed } from 'handlebars/dist/cjs/handlebars/internal/proto-access';
// @ts-expect-error: Could not find a declaration file for module
import AST from 'handlebars/dist/cjs/handlebars/compiler/ast';
// @ts-expect-error: Could not find a declaration file for module
import { indexOf } from 'handlebars/dist/cjs/handlebars/utils';
// @ts-expect-error: Could not find a declaration file for module
import { moveHelperToHooks } from 'handlebars/dist/cjs/handlebars/helpers';
import get from 'lodash/get';

export type ExtendedCompileOptions = Pick<
  CompileOptions,
  'knownHelpers' | 'knownHelpersOnly' | 'strict' | 'noEscape'
>;
export type ExtendedRuntimeOptions = Pick<RuntimeOptions, 'helpers' | 'blockParams'>;

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

const kHelper = Symbol('helper');
const kAmbiguous = Symbol('ambiguous');
const kSimple = Symbol('simple');
type NodeType = typeof kHelper | typeof kAmbiguous | typeof kSimple;

type ProcessableNode = hbs.AST.MustacheStatement | hbs.AST.BlockStatement | hbs.AST.SubExpression;
type ProcessableNodeWithPathParts = ProcessableNode & { path: hbs.AST.PathExpression };

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
  private initialHelpers: { [name: string]: Handlebars.HelperDelegate };
  private blockParamNames: any[][] = [];
  private blockParamValues: any[][] = [];
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

    this.compileOptions.knownHelpers = Object.assign(
      Object.create(null),
      {
        helperMissing: true,
        blockHelperMissing: true,
        each: true,
        if: true,
        unless: true,
        with: true,
        log: true,
        lookup: true,
      },
      this.compileOptions.knownHelpers
    );

    this.initialHelpers = Object.assign({}, helpers);

    const container: Container = (this.container = {
      helpers: {},
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

    // @ts-expect-error
    this.defaultHelperOptions.lookupProperty = container.lookupProperty;
  }

  render(context: any, options: ExtendedRuntimeOptions = {}): string {
    this.scopes = [context];
    this.output = [];
    this.container.helpers = Object.assign(this.initialHelpers, options.helpers);
    this.container.hooks = {};

    const keepHelperInHelpers = false;
    moveHelperToHooks(this.container, 'helperMissing', keepHelperInHelpers);
    moveHelperToHooks(this.container, 'blockHelperMissing', keepHelperInHelpers);

    if (!this.ast) {
      this.ast = Handlebars.parse(this.template);
    }

    this.accept(this.ast);

    return this.output.join('');
  }

  // ********************************************** //
  // ***    Visitor AST Traversal Functions     *** //
  // ********************************************** //

  Program(program: hbs.AST.Program) {
    this.blockParamNames.unshift(program.blockParams);
    super.Program(program);
    this.blockParamNames.shift();
  }

  MustacheStatement(mustache: hbs.AST.MustacheStatement) {
    this.processStatementOrExpression(mustache);
  }

  BlockStatement(block: hbs.AST.BlockStatement) {
    this.processStatementOrExpression(block);
  }

  SubExpression(sexpr: hbs.AST.SubExpression) {
    this.processStatementOrExpression(sexpr);
  }

  PathExpression(path: hbs.AST.PathExpression) {
    const context = this.scopes[path.depth];
    const name = path.parts[0];
    const value = name === undefined ? context : get(context, path.parts);
    const scoped = AST.helpers.scopedId(path);
    const blockParamId = !path.depth && !scoped && this.blockParamIndex(name);

    if (blockParamId) {
      this.output.push(this.lookupBlockParam(blockParamId, path.parts));
    } else if (this.compileOptions.noEscape === true || typeof value !== 'string') {
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
    this.output.push(undefined);
  }

  NullLiteral() {
    this.output.push(null);
  }

  // ********************************************** //
  // ***      Visitor AST Helper Functions      *** //
  // ********************************************** //

  private processStatementOrExpression(node: ProcessableNode) {
    transformLiteralToPath(node);

    switch (this.classifyNode(node as ProcessableNodeWithPathParts)) {
      case kSimple:
        this.processSimpleNode(node as ProcessableNodeWithPathParts);
        break;
      case kHelper:
        this.processHelperNode(node as ProcessableNodeWithPathParts);
        break;
      case kAmbiguous:
        this.processAmbiguousNode(node as ProcessableNodeWithPathParts);
        break;
    }
  }

  // Liftet from lib/handlebars/compiler/compiler.js (original name: classifySexpr)
  private classifyNode(node: { path: hbs.AST.PathExpression }): NodeType {
    const isSimple = AST.helpers.simpleId(node.path);
    const isBlockParam = isSimple && !!this.blockParamIndex(node.path.parts[0]);

    // a mustache is an eligible helper if:
    // * its id is simple (a single part, not `this` or `..`)
    let isHelper = !isBlockParam && AST.helpers.helperExpression(node);

    // if a mustache is an eligible helper but not a definite
    // helper, it is ambiguous, and will be resolved in a later
    // pass or at runtime.
    let isEligible = !isBlockParam && (isHelper || isSimple);

    // if ambiguous, we can possibly resolve the ambiguity now
    // An eligible helper is one that does not have a complex path, i.e. `this.foo`, `../foo` etc.
    if (isEligible && !isHelper) {
      const name = node.path.parts[0];
      const options = this.compileOptions;
      if (options.knownHelpers && options.knownHelpers[name]) {
        isHelper = true;
      } else if (options.knownHelpersOnly) {
        isEligible = false;
      }
    }

    if (isHelper) {
      return kHelper;
    } else if (isEligible) {
      return kAmbiguous;
    } else {
      return kSimple;
    }
  }

  // Liftet from lib/handlebars/compiler/compiler.js
  private blockParamIndex(name: string): [number, any] | undefined {
    for (let depth = 0, len = this.blockParamNames.length; depth < len; depth++) {
      const blockParams = this.blockParamNames[depth];
      const param = blockParams && indexOf(blockParams, name);
      if (blockParams && param >= 0) {
        return [depth, param];
      }
    }
  }

  // Looks up the value of `parts` on the given block param and pushes
  // it onto the stack.
  lookupBlockParam(blockParamId: [number, any], parts: any) {
    return this.blockParamValues[blockParamId[0]][blockParamId[1]];
  }

  private processSimpleNode(node: ProcessableNodeWithPathParts) {
    const path = node.path;
    const result = this.resolveNodes(path)[0];
    const lambdaResult = this.container.lambda(result, this.scopes[0]);

    if (isBlock(node)) {
      this.blockValue(node, lambdaResult);
    } else {
      this.output.push(lambdaResult);
    }
  }

  // The purpose of this opcode is to take a block of the form
  // `{{#this.foo}}...{{/this.foo}}`, resolve the value of `foo`, and
  // replace it on the stack with the result of properly
  // invoking blockHelperMissing.
  private blockValue(node: hbs.AST.BlockStatement, context: any) {
    const name = node.path.original;
    const options = this.setupParams(node, name);
    const result = this.container.hooks.blockHelperMissing!.call(node, context, options);
    this.output.push(result);
  }

  private processHelperNode(node: ProcessableNodeWithPathParts) {
    const path = node.path;
    const name = path.parts[0];

    if (this.compileOptions.knownHelpers && this.compileOptions.knownHelpers[name]) {
      this.invokeKnownHelper(node);
    } else if (this.compileOptions.knownHelpersOnly) {
      throw new Handlebars.Exception(
        'You specified knownHelpersOnly, but used the unknown helper ' + name,
        node
      );
    } else {
      this.invokeHelper(node);
    }
  }

  // This operation is used when the helper is known to exist,
  // so a `helperMissing` fallback is not required.
  private invokeKnownHelper(node: ProcessableNodeWithPathParts) {
    const name = node.path.parts[0];
    const helper = this.setupHelper(node, name);
    const result = helper.fn.apply(helper.context, helper.params);
    this.output.push(result);
  }

  // Pops off the helper's parameters, invokes the helper,
  // and pushes the helper's return value onto the stack.
  //
  // If the helper is not found, `helperMissing` is called.
  private invokeHelper(node: ProcessableNodeWithPathParts) {
    const path = node.path;
    const name = path.original;
    const isSimple = AST.helpers.simpleId(path);
    const helper = this.setupHelper(node, name);

    helper.fn = (isSimple && helper.fn) || this.resolveNodes(path)[0];

    if (!helper.fn) {
      if (this.compileOptions.strict) {
        helper.fn = this.container.strict(helper.context, name, node.loc);
      } else {
        helper.fn = this.container.hooks.helperMissing;
      }
    }

    const result = helper.fn.apply(helper.context, helper.params);

    this.output.push(result);
  }

  private processAmbiguousNode(node: ProcessableNodeWithPathParts) {
    const invokeResult = this.invokeAmbiguous(node);

    if (isBlock(node)) {
      const result = this.ambiguousBlockValue(node, invokeResult);
      if (result != null) {
        this.output.push(result);
      }
    } else {
      if (
        // @ts-expect-error: The `escaped` property is only on MustacheStatement nodes
        node.escaped === false ||
        this.compileOptions.noEscape === true ||
        typeof invokeResult !== 'string'
      ) {
        this.output.push(invokeResult);
      } else {
        this.output.push(Handlebars.escapeExpression(invokeResult));
      }
    }
  }

  // This operation is used when an expression like `{{foo}}`
  // is provided, but we don't know at compile-time whether it
  // is a helper or a path.
  //
  // This operation emits more code than the other options,
  // and can be avoided by passing the `knownHelpers` and
  // `knownHelpersOnly` flags at compile-time.
  private invokeAmbiguous(node: ProcessableNodeWithPathParts) {
    const name = node.path.parts[0];
    const helper = this.setupHelper(node, name);

    if (!helper.fn) {
      if (this.compileOptions.strict) {
        helper.fn = this.container.strict(helper.context, name, node.loc);
      } else {
        helper.fn =
          helper.context != null
            ? this.container.lookupProperty(helper.context, name)
            : helper.context;
        if (helper.fn == null) helper.fn = this.container.hooks.helperMissing;
      }
    }

    return typeof helper.fn === 'function'
      ? helper.fn.apply(helper.context, helper.params)
      : helper.fn;
  }

  private ambiguousBlockValue(block: hbs.AST.BlockStatement, result: any) {
    const name = block.path.parts[0];
    const helper = this.setupHelper(block, name);

    if (!helper.fn) {
      const options = helper.params[helper.params.length - 1];
      result = this.container.hooks.blockHelperMissing!.call(block, result, options);
    }

    return result;
  }

  private setupHelper(
    node: ProcessableNodeWithPathParts,
    helperName: string,
    blockHelper: boolean = false
  ) {
    return {
      fn: this.container.lookupProperty(this.container.helpers, helperName),
      context: this.scopes[0],
      params: this.setupHelperArgs(node, helperName, blockHelper),
    };
  }

  private setupHelperArgs(
    node: ProcessableNodeWithPathParts,
    helperName: string,
    blockHelper: boolean = false
  ): [...any[], Handlebars.HelperOptions] {
    if (blockHelper) {
      throw new Error('Not implemented!'); // TODO: Handle or remove this
    }
    return [...this.resolveNodes(node.params), this.setupParams(node, helperName)];
  }

  private setupParams(
    node: ProcessableNodeWithPathParts,
    helperName: string
  ): Handlebars.HelperOptions {
    const options: Handlebars.HelperOptions = {
      // @ts-expect-error: Name should be on there, but the offical types doesn't know this
      name: helperName,
      hash: this.getHash(node),
    };

    if (isBlock(node)) {
      const generateProgramFunction = (program: hbs.AST.Program) => {
        const prog = (nextContext: any, runtimeOptions: ExtendedRuntimeOptions = {}) => {
          this.scopes.unshift(nextContext);
          this.blockParamValues.unshift(runtimeOptions.blockParams || []);
          const result = this.resolveNodes(program).join('');
          this.blockParamValues.shift();
          this.scopes.shift();
          return result;
        };
        prog.blockParams = node.program?.blockParams?.length ?? 0;
        return prog;
      };

      options.fn = node.program ? generateProgramFunction(node.program) : noop;
      options.inverse = node.inverse ? generateProgramFunction(node.inverse) : noop;
    }

    return Object.assign(options, this.defaultHelperOptions);
  }

  private getHash(statement: { hash?: hbs.AST.Hash }) {
    const result: { [key: string]: any } = {};
    if (!statement.hash) return result;
    for (const { key, value } of statement.hash.pairs) {
      result[key] = this.resolveNodes(value)[0];
    }
    return result;
  }

  private resolveNodes(nodes: hbs.AST.Node | hbs.AST.Node[]): any[] {
    const currentOutput = this.output;
    this.output = [];

    if (Array.isArray(nodes)) {
      this.acceptArray(nodes);
    } else {
      this.accept(nodes);
    }

    const result = this.output;

    this.output = currentOutput;

    return result;
  }
}

// ********************************************** //
// ***            Utilily Functions           *** //
// ********************************************** //

function isBlock(node: hbs.AST.Node): node is hbs.AST.BlockStatement {
  return 'program' in node || 'inverse' in node;
}

function noop() {
  return '';
}

// liftet from handlebars lib/handlebars/compiler/compiler.js
function transformLiteralToPath(node: { path: hbs.AST.PathExpression | hbs.AST.Literal }) {
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
