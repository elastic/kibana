/*
 * Elasticsearch B.V licenses this file to you under the MIT License.
 * See `packages/kbn-handlebars/LICENSE` for more information.
 */

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

import type {
  AmbiguousHelperOptions,
  CompileOptions,
  Container,
  DecoratorDelegate,
  DecoratorsHash,
  HelperOptions,
  NodeType,
  NonBlockHelperOptions,
  ProcessableBlockStatementNode,
  ProcessableNode,
  ProcessableNodeWithPathParts,
  ProcessableNodeWithPathPartsOrLiteral,
  ProcessableStatementNode,
  ResolvePartialOptions,
  RuntimeOptions,
  Template,
  TemplateDelegate,
  VisitorHelper,
} from './types';
import { kAmbiguous, kHelper, kSimple } from './symbols';
import {
  initData,
  isBlock,
  isDecorator,
  noop,
  toDecoratorOptions,
  transformLiteralToPath,
} from './utils';

export class ElasticHandlebarsVisitor extends Handlebars.Visitor {
  private env: typeof Handlebars;
  private contexts: any[] = [];
  private output: any[] = [];
  private template?: string;
  private compileOptions: CompileOptions;
  private runtimeOptions?: RuntimeOptions;
  private blockParamNames: any[][] = [];
  private blockParamValues: any[][] = [];
  private ast?: hbs.AST.Program;
  private container: Container;
  private defaultHelperOptions: Pick<NonBlockHelperOptions, 'lookupProperty'>;
  private processedRootDecorators = false; // Root decorators should not have access to input arguments. This flag helps us detect them.
  private processedDecoratorsForProgram = new Set(); // It's important that a given program node only has its decorators run once, we use this Map to keep track of them

  constructor(
    env: typeof Handlebars,
    input: string | hbs.AST.Program,
    options: CompileOptions = {}
  ) {
    super();

    this.env = env;

    if (typeof input !== 'string' && input.type === 'Program') {
      this.ast = input;
    } else {
      this.template = input as string;
    }

    this.compileOptions = { data: true, ...options };
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

    const protoAccessControl = createProtoAccessControl({});

    const container: Container = (this.container = {
      helpers: {},
      partials: {},
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
        if (Object.hasOwn(parent, propertyName)) {
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

  render(context: any, options: RuntimeOptions = {}): string {
    this.contexts = [context];
    this.output = [];
    this.runtimeOptions = { ...options };
    this.container.helpers = { ...this.env.helpers, ...options.helpers };
    this.container.partials = { ...this.env.partials, ...options.partials };
    this.container.decorators = {
      ...(this.env.decorators as DecoratorsHash),
      ...options.decorators,
    };
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

    // The `defaultMain` function contains the default behavior:
    //
    // Generate a "program" function based on the root `Program` in the AST and
    // call it. This will start the processing of all the child nodes in the
    // AST.
    const defaultMain: TemplateDelegate = (_context) => {
      const prog = this.generateProgramFunction(this.ast!);
      return prog(_context, this.runtimeOptions);
    };

    // Run any decorators that might exist on the root:
    //
    // The `defaultMain` function is passed in, and if there are no root
    // decorators, or if the decorators chooses to do so, the same function is
    // returned from `processDecorators` and the default behavior is retained.
    //
    // Alternatively any of the root decorators might call the `defaultMain`
    // function themselves, process its return value, and return a completely
    // different `main` function.
    const main = this.processDecorators(this.ast, defaultMain);
    this.processedRootDecorators = true;

    // Call the `main` function and add the result to the final output.
    const result = main(this.context, options);

    if (main === defaultMain) {
      this.output.push(result);
      return this.output.join('');
    } else {
      // We normally expect the return value of `main` to be a string. However,
      // if a decorator is used to override the `defaultMain` function, the
      // return value can be any type. To match the upstream handlebars project
      // behavior, we want the result of rendering the template to be the
      // literal value returned by the decorator.
      //
      // Since the output array in this case always will be empty, we just
      // return that single value instead of attempting to join all the array
      // elements as strings.
      return result;
    }
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

  PartialStatement(partial: hbs.AST.PartialStatement) {
    this.invokePartial(partial);
  }

  PartialBlockStatement(partial: hbs.AST.PartialBlockStatement) {
    this.invokePartial(partial);
  }

  // This space is intentionally left blank: We want to override the Visitor
  // class implementation of this method, but since we handle decorators
  // separately before traversing the nodes, we just want to make this a no-op.
  DecoratorBlock(decorator: hbs.AST.DecoratorBlock) {}

  // This space is intentionally left blank: We want to override the Visitor
  // class implementation of this method, but since we handle decorators
  // separately before traversing the nodes, we just want to make this a no-op.
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
      result = this.resolvePath(this.contexts[path.depth], path);
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
  private processDecorators(program: hbs.AST.Program, prog: TemplateDelegate) {
    if (!this.processedDecoratorsForProgram.has(program)) {
      this.processedDecoratorsForProgram.add(program);
      const props = {};
      for (const node of program.body) {
        if (isDecorator(node)) {
          prog = this.processDecorator(node, prog, props);
        }
      }
    }

    return prog;
  }

  private processDecorator(
    decorator: hbs.AST.DecoratorBlock | hbs.AST.Decorator,
    prog: TemplateDelegate,
    props: Record<string, any>
  ) {
    const options = this.setupDecoratorOptions(decorator);

    const result = this.container.lookupProperty<DecoratorDelegate>(
      this.container.decorators,
      options.name
    )(prog, props, this.container, options);

    return Object.assign(result || prog, props);
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

  private pushToOutputWithEscapeCheck(result: any, node: ProcessableNodeWithPathParts) {
    if (
      !(node as hbs.AST.MustacheStatement).escaped ||
      this.compileOptions.noEscape === true ||
      typeof result !== 'string'
    ) {
      this.output.push(result);
    } else {
      this.output.push(Handlebars.escapeExpression(result));
    }
  }

  private processSimpleNode(node: ProcessableNodeWithPathParts) {
    const path = node.path;
    // @ts-expect-error strict is not a valid property on PathExpression, but we used in the same way it's also used in the original handlebars
    path.strict = true;
    const result = this.resolveNodes(path)[0];
    const lambdaResult = this.container.lambda(result, this.context);

    if (isBlock(node)) {
      this.blockValue(node, lambdaResult);
    } else {
      this.pushToOutputWithEscapeCheck(lambdaResult, node);
    }
  }

  // The purpose of this opcode is to take a block of the form
  // `{{#this.foo}}...{{/this.foo}}`, resolve the value of `foo`, and
  // replace it on the stack with the result of properly
  // invoking blockHelperMissing.
  private blockValue(node: hbs.AST.BlockStatement, value: any) {
    const name = node.path.original;
    const options = this.setupParams(node, name);

    const result = this.container.hooks.blockHelperMissing!.call(this.context, value, options);

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

    this.pushToOutputWithEscapeCheck(result, node);
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

    this.pushToOutputWithEscapeCheck(result, node);
  }

  private invokePartial(partial: hbs.AST.PartialStatement | hbs.AST.PartialBlockStatement) {
    const { params } = partial;
    if (params.length > 1) {
      throw new Handlebars.Exception(
        `Unsupported number of partial arguments: ${params.length}`,
        partial
      );
    }

    const isDynamic = partial.name.type === 'SubExpression';
    const name = isDynamic
      ? this.resolveNodes(partial.name).join('')
      : (partial.name as hbs.AST.PathExpression).original;

    const options: AmbiguousHelperOptions & ResolvePartialOptions = this.setupParams(partial, name);
    options.helpers = this.container.helpers;
    options.partials = this.container.partials;
    options.decorators = this.container.decorators;

    let partialBlock;
    if ('fn' in options && options.fn !== noop) {
      const { fn } = options;
      const currentPartialBlock = options.data?.['partial-block'];
      options.data = createFrame(options.data);

      // Wrapper function to get access to currentPartialBlock from the closure
      partialBlock = options.data['partial-block'] = function partialBlockWrapper(
        context: any,
        wrapperOptions: { data?: HelperOptions['data'] } = {}
      ) {
        // Restore the partial-block from the closure for the execution of the block
        // i.e. the part inside the block of the partial call.
        wrapperOptions.data = createFrame(wrapperOptions.data);
        wrapperOptions.data['partial-block'] = currentPartialBlock;
        return fn(context, wrapperOptions);
      };

      if (fn.partials) {
        options.partials = { ...options.partials, ...fn.partials };
      }
    }

    let context = {};
    if (params.length === 0 && !this.compileOptions.explicitPartialContext) {
      context = this.context;
    } else if (params.length === 1) {
      context = this.resolveNodes(params[0])[0];
    }

    if (Object.keys(options.hash).length > 0) {
      // TODO: context can be an array, but maybe never when we have a hash???
      context = Object.assign({}, context, options.hash);
    }

    const partialTemplate: Template | undefined =
      this.container.partials[name] ??
      partialBlock ??
      // TypeScript note: We extend ResolvePartialOptions in our types.ts file
      // to fix an error in the upstream type. When calling back into the
      // upstream code, we just cast back to the non-extended type
      Handlebars.VM.resolvePartial(
        undefined,
        undefined,
        options as Handlebars.ResolvePartialOptions
      );

    if (partialTemplate === undefined) {
      throw new Handlebars.Exception(`The partial ${name} could not be found`);
    }

    let render;
    if (typeof partialTemplate === 'string') {
      render = this.env.compileAST(partialTemplate, this.compileOptions);
      if (name in this.container.partials) {
        this.container.partials[name] = render;
      }
    } else {
      render = partialTemplate;
    }

    let result = render(context, options);

    if ('indent' in partial) {
      result =
        partial.indent +
        (this.compileOptions.preventIndent
          ? result
          : result.replace(/\n(?!$)/g, `\n${partial.indent}`)); // indent each line, ignoring any trailing linebreak
    }

    this.output.push(result);
  }

  private processAmbiguousNode(node: ProcessableNodeWithPathParts) {
    const name = node.path.parts[0];
    const helper = this.setupHelper(node, name);
    let { fn: helperFn } = helper;

    const loc = helperFn ? node.loc : node.path.loc;
    helperFn = helperFn ?? this.resolveNodes(node.path)[0];

    if (helperFn === undefined) {
      if (this.compileOptions.strict) {
        helperFn = this.container.strict(helper.context, name, loc);
      } else {
        helperFn =
          helper.context != null
            ? this.container.lookupProperty(helper.context, name)
            : helper.context;
        if (helperFn == null) helperFn = this.container.hooks.helperMissing;
      }
    }

    const helperResult =
      typeof helperFn === 'function'
        ? helperFn.call(helper.context, ...helper.params, helper.options)
        : helperFn;

    if (isBlock(node)) {
      const result = helper.fn
        ? helperResult
        : this.container.hooks.blockHelperMissing!.call(this.context, helperResult, helper.options);
      if (result != null) {
        this.output.push(result);
      }
    } else {
      if (
        (node as hbs.AST.MustacheStatement).escaped === false ||
        this.compileOptions.noEscape === true ||
        typeof helperResult !== 'string'
      ) {
        this.output.push(helperResult);
      } else {
        this.output.push(Handlebars.escapeExpression(helperResult));
      }
    }
  }

  private setupHelper(node: ProcessableNode, helperName: string): VisitorHelper {
    return {
      fn: this.container.lookupProperty(this.container.helpers, helperName),
      context: this.context,
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
        const context = this.contexts.shift();
        options.args = this.resolveNodes(decorator.params);
        this.contexts.unshift(context);
      } else {
        options.args = this.resolveNodes(decorator.params);
      }
    } else {
      options.args = [];
    }

    return options;
  }

  private setupParams(node: ProcessableBlockStatementNode, name: string): HelperOptions;
  private setupParams(node: ProcessableStatementNode, name: string): NonBlockHelperOptions;
  private setupParams(node: ProcessableNode, name: string): AmbiguousHelperOptions;
  private setupParams(node: ProcessableNode, name: string) {
    const options: AmbiguousHelperOptions = {
      name,
      hash: this.getHash(node),
      data: this.runtimeOptions!.data,
      loc: { start: node.loc.start, end: node.loc.end },
      ...this.defaultHelperOptions,
    };

    if (isBlock(node)) {
      (options as HelperOptions).fn = node.program
        ? this.processDecorators(node.program, this.generateProgramFunction(node.program))
        : noop;
      (options as HelperOptions).inverse = node.inverse
        ? this.processDecorators(node.inverse, this.generateProgramFunction(node.inverse))
        : noop;
    }

    return options;
  }

  private generateProgramFunction(program: hbs.AST.Program) {
    if (!program) return noop;

    const prog: TemplateDelegate = (nextContext: any, runtimeOptions: RuntimeOptions = {}) => {
      runtimeOptions = { ...runtimeOptions };

      // inherit data in blockParams from parent program
      runtimeOptions.data = runtimeOptions.data || this.runtimeOptions!.data;
      if (runtimeOptions.blockParams) {
        runtimeOptions.blockParams = runtimeOptions.blockParams.concat(
          this.runtimeOptions!.blockParams
        );
      }

      // inherit partials from parent program
      runtimeOptions.partials = runtimeOptions.partials || this.runtimeOptions!.partials;

      // stash parent program data
      const tmpRuntimeOptions = this.runtimeOptions;
      this.runtimeOptions = runtimeOptions;
      const shiftContext = nextContext !== this.context;
      if (shiftContext) this.contexts.unshift(nextContext);
      this.blockParamValues.unshift(runtimeOptions.blockParams || []);

      // execute child program
      const result = this.resolveNodes(program).join('');

      // unstash parent program data
      this.blockParamValues.shift();
      if (shiftContext) this.contexts.shift();
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

  private get context() {
    return this.contexts[0];
  }
}
