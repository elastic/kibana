/*
 * Elasticsearch B.V licenses this file to you under the MIT License.
 * See `packages/kbn-handlebars/LICENSE` for more information.
 */

// The handlebars module uses `export =`, so we should technically use `import Handlebars = require('handlebars')`, but Babel will not allow this.
import Handlebars from 'handlebars';
import {
  createProtoAccessControl,
  resultIsAllowed,
  // @ts-expect-error: Could not find a declaration file for module
} from 'handlebars/dist/cjs/handlebars/internal/proto-access';
// @ts-expect-error: Could not find a declaration file for module
import AST from 'handlebars/dist/cjs/handlebars/compiler/ast';
// @ts-expect-error: Could not find a declaration file for module
import { indexOf, createFrame } from 'handlebars/dist/cjs/handlebars/utils';
// @ts-expect-error: Could not find a declaration file for module
import { moveHelperToHooks } from 'handlebars/dist/cjs/handlebars/helpers';

const originalCreate = Handlebars.create;

/**
 * A custom version of the Handlesbars module with an extra `compileAST` function and fixed typings.
 */
declare module 'handlebars' {
  export function compileAST(
    input: string | hbs.AST.Program,
    options?: ExtendedCompileOptions
  ): (context?: any, options?: ExtendedRuntimeOptions) => string;

  // --------------------------------------------------------
  // Override/Extend inherited types below that are incorrect
  // --------------------------------------------------------

  export interface TemplateDelegate<T = any> {
    (context?: T, options?: RuntimeOptions): string; // Override to ensure `context` is optional
    blockParams?: number; // TODO: Can this really be optional?
  }

  export interface HelperOptions {
    name: string;
    loc: { start: hbs.AST.SourceLocation['start']; end: hbs.AST.SourceLocation['end'] };
    lookupProperty: LookupProperty;
  }

  export interface HelperDelegate {
    // eslint-disable-next-line @typescript-eslint/prefer-function-type
    (...params: any[]): any;
  }
}

const kHelper = Symbol('helper');
const kAmbiguous = Symbol('ambiguous');
const kSimple = Symbol('simple');
type NodeType = typeof kHelper | typeof kAmbiguous | typeof kSimple;

type LookupProperty = <T = any>(parent: { [name: string]: any }, propertyName: string) => T;

type ProcessableStatementNode = hbs.AST.MustacheStatement | hbs.AST.SubExpression;
type ProcessableBlockStatementNode = hbs.AST.BlockStatement | hbs.AST.PartialBlockStatement;
type ProcessableNode = ProcessableStatementNode | ProcessableBlockStatementNode;
type ProcessableNodeWithPathParts = ProcessableNode & { path: hbs.AST.PathExpression };
type ProcessableNodeWithPathPartsOrLiteral = ProcessableNode & {
  path: hbs.AST.PathExpression | hbs.AST.Literal;
};

export type NonBlockHelperOptions = Omit<Handlebars.HelperOptions, 'fn' | 'inverse'>;
export type AmbiguousHelperOptions = Handlebars.HelperOptions | NonBlockHelperOptions;

export interface DecoratorOptions extends Omit<Handlebars.HelperOptions, 'lookupProperties'> {
  args?: any[];
}

/**
 * If the `unsafe-eval` CSP is set, this string constant will be `compile`,
 * otherwise `compileAST`.
 *
 * This can be used to call the more optimized `compile` function in
 * environments that support it, or fall back to `compileAST` on environments
 * that don't.
 */
export const compileFnName: 'compile' | 'compileAST' = allowUnsafeEval() ? 'compile' : 'compileAST';

/**
 * Supported Handlebars compile options.
 *
 * This is a subset of all the compile options supported by the upstream
 * Handlebars module.
 */
export type ExtendedCompileOptions = Pick<
  CompileOptions,
  'data' | 'knownHelpers' | 'knownHelpersOnly' | 'noEscape' | 'strict' | 'assumeObjects'
>;

/**
 * Supported Handlebars runtime options
 *
 * This is a subset of all the runtime options supported by the upstream
 * Handlebars module.
 */
export type ExtendedRuntimeOptions = Pick<
  RuntimeOptions,
  'data' | 'helpers' | 'decorators' | 'blockParams'
>;

/**
 * According to the [decorator docs]{@link https://github.com/handlebars-lang/handlebars.js/blob/4.x/docs/decorators-api.md},
 * a decorator will be called with a different set of arugments than what's actually happening in the upstream code.
 * So here I assume that the docs are wrong and that the upstream code is correct. In reality, `context` is the last 4
 * documented arguments rolled into one object.
 */
export type DecoratorFunction = (
  prog: Handlebars.TemplateDelegate,
  props: Record<string, any>,
  container: Container,
  options: any
) => any;

export interface HelpersHash {
  [name: string]: Handlebars.HelperDelegate;
}

export interface DecoratorsHash {
  [name: string]: DecoratorFunction;
}

// The handlebars module uses `export =`, so it can't be re-exported using `export *`.
// However, because of Babel, we're not allowed to use `export =` ourselves.
// So we have to resort to using `exports default` even though eslint doesn't like it.
//
// eslint-disable-next-line import/no-default-export
export default Handlebars;

/**
 * Creates an isolated Handlebars environment.
 *
 * Each environment has its own helpers.
 * This is only necessary for use cases that demand distinct helpers.
 * Most use cases can use the root Handlebars environment directly.
 *
 * @returns A sandboxed/scoped version of the @kbn/handlebars module
 */
export function create(): typeof Handlebars {
  const SandboxedHandlebars = originalCreate.call(Handlebars) as typeof Handlebars;
  // When creating new Handlebars environments, ensure the custom compileAST function is present in the new environment as well
  SandboxedHandlebars.compileAST = Handlebars.compileAST;
  return SandboxedHandlebars;
}

Handlebars.create = create;

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
  const helpers = (this ?? Handlebars).helpers;
  const decorators = (this ?? Handlebars).decorators as DecoratorsHash;

  const visitor = new ElasticHandlebarsVisitor(input, options, helpers, decorators);
  return (context: any, runtimeOptions?: ExtendedRuntimeOptions) =>
    visitor.render(context, runtimeOptions);
};

interface Container {
  helpers: HelpersHash;
  decorators: DecoratorsHash;
  strict: (obj: { [name: string]: any }, name: string, loc: hbs.AST.SourceLocation) => any;
  lookupProperty: LookupProperty;
  lambda: (current: any, context: any) => any;
  data: (value: any, depth: number) => any;
  hooks: {
    helperMissing?: Handlebars.HelperDelegate;
    blockHelperMissing?: Handlebars.HelperDelegate;
  };
}

class ElasticHandlebarsVisitor extends Handlebars.Visitor {
  private scopes: any[] = [];
  private output: any[] = [];
  private template?: string;
  private compileOptions: ExtendedCompileOptions;
  private runtimeOptions?: ExtendedRuntimeOptions;
  private initialHelpers: HelpersHash;
  private initialDecorators: DecoratorsHash;
  private blockParamNames: any[][] = [];
  private blockParamValues: any[][] = [];
  private ast?: hbs.AST.Program;
  private container: Container;
  private defaultHelperOptions: Pick<NonBlockHelperOptions, 'lookupProperty'>;
  private processedRootDecorators = false; // Root decorators should not have access to input arguments. This flag helps us detect them.
  private processedDecoratorsForProgram = new Set(); // It's important that a given program node only has its decorators run once, we use this Map to keep track of them

  constructor(
    input: string | hbs.AST.Program,
    options: ExtendedCompileOptions = {},
    helpers: HelpersHash,
    decorators: DecoratorsHash
  ) {
    super();

    if (typeof input !== 'string' && input.type === 'Program') {
      this.ast = input;
    } else {
      this.template = input as string;
    }

    this.compileOptions = Object.assign(
      {
        data: true,
      },
      options
    );

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
    this.initialDecorators = Object.assign({}, decorators);

    const protoAccessControl = createProtoAccessControl({});

    const container: Container = (this.container = {
      helpers: {},
      decorators: {},
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

        if (resultIsAllowed(result, protoAccessControl, propertyName)) {
          return result;
        }
        return undefined;
      },
      // this function is lifted from the handlebars source and slightly modified (lib/handlebars/runtime.js)
      lambda(current, context) {
        return typeof current === 'function' ? current.call(context) : current;
      },
      data(value: any, depth: number) {
        while (value && depth--) {
          value = value._parent;
        }
        return value;
      },
      hooks: {},
    });

    this.defaultHelperOptions = {
      lookupProperty: container.lookupProperty,
    };
  }

  render(context: any, options: ExtendedRuntimeOptions = {}): string {
    this.scopes = [context];
    this.output = [];
    this.runtimeOptions = options;
    this.container.helpers = Object.assign(this.initialHelpers, options.helpers);
    this.container.decorators = Object.assign(
      this.initialDecorators,
      options.decorators as DecoratorsHash
    );
    this.container.hooks = {};
    this.processedRootDecorators = false;
    this.processedDecoratorsForProgram.clear();

    if (this.compileOptions.data) {
      this.runtimeOptions.data = initData(context, this.runtimeOptions.data);
    }

    const keepHelperInHelpers = false;
    moveHelperToHooks(this.container, 'helperMissing', keepHelperInHelpers);
    moveHelperToHooks(this.container, 'blockHelperMissing', keepHelperInHelpers);

    if (!this.ast) {
      this.ast = Handlebars.parse(this.template!);
    }

    this.accept(this.ast);

    return this.output.join('');
  }

  // ********************************************** //
  // ***    Visitor AST Traversal Functions     *** //
  // ********************************************** //

  Program(program: hbs.AST.Program) {
    this.blockParamNames.unshift(program.blockParams);

    // Run any decorators that might exist on the root
    this.processDecorators(program, this.generateProgramFunction(program));
    this.processedRootDecorators = true;

    super.Program(program);
    this.blockParamNames.shift();
  }

  MustacheStatement(mustache: hbs.AST.MustacheStatement) {
    this.processStatementOrExpression(mustache);
  }

  BlockStatement(block: hbs.AST.BlockStatement) {
    this.processStatementOrExpression(block);
  }

  // This space intentionally left blank: We want to override the Visitor class implementation
  // of this method, but since we handle decorators separately before traversing the nodes, we
  // just want to make this a no-op.
  DecoratorBlock(decorator: hbs.AST.DecoratorBlock) {}

  // This space intentionally left blank: We want to override the Visitor class implementation
  // of this method, but since we handle decorators separately before traversing the nodes, we
  // just want to make this a no-op.
  Decorator(decorator: hbs.AST.Decorator) {}

  SubExpression(sexpr: hbs.AST.SubExpression) {
    this.processStatementOrExpression(sexpr);
  }

  PathExpression(path: hbs.AST.PathExpression) {
    const blockParamId =
      !path.depth && !AST.helpers.scopedId(path) && this.blockParamIndex(path.parts[0]);

    let result;
    if (blockParamId) {
      result = this.lookupBlockParam(blockParamId, path);
    } else if (path.data) {
      result = this.lookupData(this.runtimeOptions!.data, path);
    } else {
      result = this.resolvePath(this.scopes[path.depth], path);
    }

    this.output.push(result);
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

  /**
   * Special code for decorators, since they have to be executed ahead of time (before the wrapping program).
   * So we have to look into the program AST body and see if it contains any decorators that we have to process
   * before we can finish processing of the wrapping program.
   */
  private processDecorators(program: hbs.AST.Program, prog: Handlebars.TemplateDelegate) {
    if (!this.processedDecoratorsForProgram.has(program)) {
      for (const node of program.body) {
        if (isDecorator(node)) {
          this.processDecorator(node, prog);
        }
      }
      this.processedDecoratorsForProgram.add(program);
    }
  }

  private processDecorator(
    decorator: hbs.AST.DecoratorBlock | hbs.AST.Decorator,
    prog: Handlebars.TemplateDelegate
  ) {
    const props = {};
    const options = this.setupDecoratorOptions(decorator);

    const result = this.container.lookupProperty<DecoratorFunction>(
      this.container.decorators,
      options.name
    )(prog, props, this.container, options);

    Object.assign(result || prog, props);
  }

  private processStatementOrExpression(node: ProcessableNodeWithPathPartsOrLiteral) {
    // Calling `transformLiteralToPath` has side-effects!
    // It converts a node from type `ProcessableNodeWithPathPartsOrLiteral` to `ProcessableNodeWithPathParts`
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
  private lookupBlockParam(blockParamId: [number, any], path: hbs.AST.PathExpression) {
    const value = this.blockParamValues[blockParamId[0]][blockParamId[1]];
    return this.resolvePath(value, path, 1);
  }

  // Push the data lookup operator
  private lookupData(data: any, path: hbs.AST.PathExpression) {
    if (path.depth) {
      data = this.container.data(data, path.depth);
    }

    return this.resolvePath(data, path);
  }

  private processSimpleNode(node: ProcessableNodeWithPathParts) {
    const path = node.path;
    // @ts-expect-error strict is not a valid property on PathExpression, but we used in the same way it's also used in the original handlebars
    path.strict = true;
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
  private blockValue(node: hbs.AST.BlockStatement, value: any) {
    const name = node.path.original;
    const options = this.setupParams(node, name);

    const context = this.scopes[0];
    const result = this.container.hooks.blockHelperMissing!.call(context, value, options);

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
    // TypeScript: `helper.fn` might be `undefined` at this point, but to match the upstream behavior we call it without any guards
    const result = helper.fn!.call(helper.context, ...helper.params, helper.options);
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

    const loc = isSimple && helper.fn ? node.loc : path.loc;
    helper.fn = (isSimple && helper.fn) || this.resolveNodes(path)[0];

    if (!helper.fn) {
      if (this.compileOptions.strict) {
        helper.fn = this.container.strict(helper.context, name, loc);
      } else {
        helper.fn = this.container.hooks.helperMissing;
      }
    }

    // TypeScript: `helper.fn` might be `undefined` at this point, but to match the upstream behavior we call it without any guards
    const result = helper.fn!.call(helper.context, ...helper.params, helper.options);

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
        (node as hbs.AST.MustacheStatement).escaped === false ||
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

    const loc = helper.fn ? node.loc : node.path.loc;
    helper.fn = helper.fn ?? this.resolveNodes(node.path)[0];

    if (helper.fn === undefined) {
      if (this.compileOptions.strict) {
        helper.fn = this.container.strict(helper.context, name, loc);
      } else {
        helper.fn =
          helper.context != null
            ? this.container.lookupProperty(helper.context, name)
            : helper.context;
        if (helper.fn == null) helper.fn = this.container.hooks.helperMissing;
      }
    }

    return typeof helper.fn === 'function'
      ? helper.fn.call(helper.context, ...helper.params, helper.options)
      : helper.fn;
  }

  private ambiguousBlockValue(block: hbs.AST.BlockStatement, value: any) {
    const name = block.path.parts[0];
    const helper = this.setupHelper(block, name);

    if (!helper.fn) {
      const context = this.scopes[0];
      value = this.container.hooks.blockHelperMissing!.call(context, value, helper.options);
    }

    return value;
  }

  private setupHelper(
    node: ProcessableNode,
    helperName: string
  ): {
    fn?: Handlebars.HelperDelegate;
    context: any[];
    params: any[];
    options: AmbiguousHelperOptions;
  } {
    return {
      fn: this.container.lookupProperty(this.container.helpers, helperName),
      context: this.scopes[0],
      params: this.resolveNodes(node.params),
      options: this.setupParams(node, helperName),
    };
  }

  private setupDecoratorOptions(decorator: hbs.AST.Decorator | hbs.AST.DecoratorBlock) {
    // TypeScript: The types indicate that `decorator.path` technically can be an `hbs.AST.Literal`. However, the upstream codebase always treats it as an `hbs.AST.PathExpression`, so we do too.
    const name = (decorator.path as hbs.AST.PathExpression).original;
    const options = toDecoratorOptions(this.setupParams(decorator, name));

    if (decorator.params.length > 0) {
      if (!this.processedRootDecorators) {
        // When processing the root decorators, temporarily remove the root context so it's not accessible to the decorator
        const context = this.scopes.shift();
        options.args = this.resolveNodes(decorator.params);
        this.scopes.unshift(context);
      } else {
        options.args = this.resolveNodes(decorator.params);
      }
    }

    return options;
  }

  private setupParams(node: ProcessableBlockStatementNode, name: string): Handlebars.HelperOptions;
  private setupParams(node: ProcessableStatementNode, name: string): NonBlockHelperOptions;
  private setupParams(node: ProcessableNode, name: string): AmbiguousHelperOptions;
  private setupParams(node: ProcessableNode, name: string): AmbiguousHelperOptions {
    const options = {
      name,
      hash: this.getHash(node),
      data: this.runtimeOptions!.data,
      loc: { start: node.loc.start, end: node.loc.end },
      ...this.defaultHelperOptions,
    };

    if (isBlock(node)) {
      // TODO: Is there a way in TypeScript to infer that `options` is `Handlebars.HelperOptions` inside this if-statement. If not, is there a way to just cast once?
      (options as Handlebars.HelperOptions).fn = this.generateProgramFunction(node.program);
      if (node.program)
        this.processDecorators(node.program, (options as Handlebars.HelperOptions).fn);
      (options as Handlebars.HelperOptions).inverse = this.generateProgramFunction(node.inverse);
      if (node.inverse)
        this.processDecorators(node.inverse, (options as Handlebars.HelperOptions).inverse);
    }

    return options;
  }

  private generateProgramFunction(program: hbs.AST.Program) {
    if (!program) return noop;

    const prog: Handlebars.TemplateDelegate = (
      nextContext: any,
      runtimeOptions: ExtendedRuntimeOptions = {}
    ) => {
      runtimeOptions = Object.assign({}, runtimeOptions);

      // inherit data in blockParams from parent program
      runtimeOptions.data = runtimeOptions.data || this.runtimeOptions!.data;
      if (runtimeOptions.blockParams) {
        runtimeOptions.blockParams = runtimeOptions.blockParams.concat(
          this.runtimeOptions!.blockParams
        );
      }

      // stash parent program data
      const tmpRuntimeOptions = this.runtimeOptions;
      this.runtimeOptions = runtimeOptions;
      const shiftContext = nextContext !== this.scopes[0];
      if (shiftContext) this.scopes.unshift(nextContext);
      this.blockParamValues.unshift(runtimeOptions.blockParams || []);

      // execute child program
      const result = this.resolveNodes(program).join('');

      // unstash parent program data
      this.blockParamValues.shift();
      if (shiftContext) this.scopes.shift();
      this.runtimeOptions = tmpRuntimeOptions;

      // return result of child program
      return result;
    };

    prog.blockParams = program.blockParams?.length ?? 0;
    return prog;
  }

  private getHash(statement: { hash?: hbs.AST.Hash }) {
    const result: { [key: string]: any } = {};
    if (!statement.hash) return result;
    for (const { key, value } of statement.hash.pairs) {
      result[key] = this.resolveNodes(value)[0];
    }
    return result;
  }

  private resolvePath(obj: any, path: hbs.AST.PathExpression, index = 0) {
    if (this.compileOptions.strict || this.compileOptions.assumeObjects) {
      return this.strictLookup(obj, path);
    }

    for (; index < path.parts.length; index++) {
      if (obj == null) return;
      obj = this.container.lookupProperty(obj, path.parts[index]);
    }

    return obj;
  }

  private strictLookup(obj: any, path: hbs.AST.PathExpression) {
    // @ts-expect-error strict is not a valid property on PathExpression, but we used in the same way it's also used in the original handlebars
    const requireTerminal = this.compileOptions.strict && path.strict;
    const len = path.parts.length - (requireTerminal ? 1 : 0);

    for (let i = 0; i < len; i++) {
      obj = this.container.lookupProperty(obj, path.parts[i]);
    }

    if (requireTerminal) {
      return this.container.strict(obj, path.parts[len], path.loc);
    } else {
      return obj;
    }
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

function isDecorator(node: hbs.AST.Node): node is hbs.AST.Decorator | hbs.AST.DecoratorBlock {
  return node.type === 'Decorator' || node.type === 'DecoratorBlock';
}

function toDecoratorOptions(options: AmbiguousHelperOptions) {
  // There's really no tests/documentation on this, but to match the upstream codebase we'll remove `lookupProperty` from the decorator context
  delete (options as any).lookupProperty;

  return options as DecoratorOptions;
}

function noop() {
  return '';
}

// liftet from handlebars lib/handlebars/runtime.js
function initData(context: any, data: any) {
  if (!data || !('root' in data)) {
    data = data ? createFrame(data) : {};
    data.root = context;
  }
  return data;
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

function allowUnsafeEval() {
  try {
    new Function();
    return true;
  } catch (e) {
    return false;
  }
}
