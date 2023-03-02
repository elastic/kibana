/*
 * Elasticsearch B.V licenses this file to you under the MIT License.
 * See `packages/kbn-handlebars/LICENSE` for more information.
 */

import { kHelper, kAmbiguous, kSimple } from './symbols';

// Unexported `CompileOptions` lifted from node_modules/handlebars/types/index.d.ts
// While it could also be extracted using `NonNullable<Parameters<typeof Handlebars.compile>[1]>`, this isn't possible since we declare the handlebars module below
interface HandlebarsCompileOptions {
  data?: boolean;
  compat?: boolean;
  knownHelpers?: KnownHelpers;
  knownHelpersOnly?: boolean;
  noEscape?: boolean;
  strict?: boolean;
  assumeObjects?: boolean;
  preventIndent?: boolean;
  ignoreStandalone?: boolean;
  explicitPartialContext?: boolean;
}

/**
 * A custom version of the Handlebars module with an extra `compileAST` function and fixed typings.
 */
declare module 'handlebars' {
  /**
   * Compiles the given Handlebars template without the use of `eval`.
   *
   * @returns A render function with the same API as the return value from the regular Handlebars `compile` function.
   */
  export function compileAST(
    input: string | hbs.AST.Program,
    options?: CompileOptions
  ): TemplateDelegateFixed;

  // --------------------------------------------------------
  // Override/Extend inherited funcions and interfaces below that are incorrect.
  //
  // Any exported `const` or `type` types can't be overwritten, so we'll just
  // have to live with those and cast them to the correct types in our code.
  // Some of these fixed types, we'll instead export outside the scope of this
  // 'handlebars' module so consumers of @kbn/handlebars at least have a way to
  // access the correct types.
  // --------------------------------------------------------

  /**
   * A {@link https://handlebarsjs.com/api-reference/helpers.html helper-function} type.
   *
   * When registering a helper function, it should be of this type.
   */
  export interface HelperDelegate extends HelperDelegateFixed {} // eslint-disable-line @typescript-eslint/no-empty-interface

  /**
   * A template-function type.
   *
   * This type is primarily used for the return value of by calls to
   * {@link https://handlebarsjs.com/api-reference/compilation.html#handlebars-compile-template-options Handlebars.compile},
   * Handlebars.compileAST and {@link https://handlebarsjs.com/api-reference/compilation.html#handlebars-precompile-template-options Handlebars.template}.
   */
  export interface TemplateDelegate<T = any> extends TemplateDelegateFixed<T> {} // eslint-disable-line @typescript-eslint/no-empty-interface

  /**
   * Register one or more {@link https://handlebarsjs.com/api-reference/runtime.html#handlebars-registerpartial-name-partial partials}.
   *
   * @param spec A key/value object where each key is the name of a partial (a string) and each value is the partial (either a string or a partial function).
   */
  export function registerPartial(spec: Record<string, TemplateFixed>): void; // Ensure `spec` object values can be strings
}

/**
 * Supported Handlebars compile options.
 *
 * This is a subset of all the compile options supported by the upstream
 * Handlebars module.
 */
export type CompileOptions = Pick<
  HandlebarsCompileOptions,
  | 'data'
  | 'knownHelpers'
  | 'knownHelpersOnly'
  | 'noEscape'
  | 'strict'
  | 'assumeObjects'
  | 'preventIndent'
  | 'explicitPartialContext'
>;

/**
 * Supported Handlebars runtime options
 *
 * This is a subset of all the runtime options supported by the upstream
 * Handlebars module.
 */
export interface RuntimeOptions extends Pick<Handlebars.RuntimeOptions, 'data' | 'blockParams'> {
  // The upstream `helpers` property is too loose and allows all functions.
  helpers?: HelpersHash;
  // The upstream `partials` property is incorrectly typed and doesn't allow
  // partials to be strings.
  partials?: PartialsHash;
  // The upstream `decorators` property is too loose and allows all functions.
  decorators?: DecoratorsHash;
}

/**
 * The last argument being passed to a helper function is a an {@link https://handlebarsjs.com/api-reference/helpers.html#the-options-parameter options object}.
 */
export interface HelperOptions extends Omit<Handlebars.HelperOptions, 'fn' | 'inverse'> {
  name: string;
  fn: TemplateDelegateFixed;
  inverse: TemplateDelegateFixed;
  loc: { start: hbs.AST.SourceLocation['start']; end: hbs.AST.SourceLocation['end'] };
  lookupProperty: LookupProperty;
}

// Use the post-fix `Fixed` to allow us to acces it inside the 'handlebars' module declared above
/**
 * A {@link https://handlebarsjs.com/api-reference/helpers.html helper-function} type.
 *
 * When registering a helper function, it should be of this type.
 */
interface HelperDelegateFixed {
  // eslint-disable-next-line @typescript-eslint/prefer-function-type
  (...params: any[]): any;
}
export type { HelperDelegateFixed as HelperDelegate };

// Use the post-fix `Fixed` to allow us to acces it inside the 'handlebars' module declared above
/**
 * A template-function type.
 *
 * This type is primarily used for the return value of by calls to
 * {@link https://handlebarsjs.com/api-reference/compilation.html#handlebars-compile-template-options Handlebars.compile},
 * Handlebars.compileAST and {@link https://handlebarsjs.com/api-reference/compilation.html#handlebars-precompile-template-options Handlebars.template}.
 */
interface TemplateDelegateFixed<T = any> {
  (context?: T, options?: RuntimeOptions): string; // Override to ensure `context` is optional
  blockParams?: number; // TODO: Can this really be optional?
  partials?: PartialsHash;
}
export type { TemplateDelegateFixed as TemplateDelegate };

// According to the decorator docs
// (https://github.com/handlebars-lang/handlebars.js/blob/4.x/docs/decorators-api.md)
// a decorator will be called with a different set of arugments than what's
// actually happening in the upstream code. So here I assume that the docs are
// wrong and that the upstream code is correct. In reality, `context` is the
// last 4 documented arguments rolled into one object.
/**
 * A {@link https://github.com/handlebars-lang/handlebars.js/blob/master/docs/decorators-api.md decorator-function} type.
 *
 * When registering a decorator function, it should be of this type.
 */
export type DecoratorDelegate = (
  prog: TemplateDelegateFixed,
  props: Record<string, any>,
  container: Container,
  options: any
) => any;

// -----------------------------------------------------------------------------
// INTERNAL TYPES
// -----------------------------------------------------------------------------

export type NodeType = typeof kHelper | typeof kAmbiguous | typeof kSimple;

type LookupProperty = <T = any>(parent: Record<string, any>, propertyName: string) => T;

export type NonBlockHelperOptions = Omit<HelperOptions, 'fn' | 'inverse'>;
export type AmbiguousHelperOptions = HelperOptions | NonBlockHelperOptions;

export type ProcessableStatementNode =
  | hbs.AST.MustacheStatement
  | hbs.AST.PartialStatement
  | hbs.AST.SubExpression;
export type ProcessableBlockStatementNode = hbs.AST.BlockStatement | hbs.AST.PartialBlockStatement;
export type ProcessableNode = ProcessableStatementNode | ProcessableBlockStatementNode;
export type ProcessableNodeWithPathParts = ProcessableNode & { path: hbs.AST.PathExpression };
export type ProcessableNodeWithPathPartsOrLiteral = ProcessableNode & {
  path: hbs.AST.PathExpression | hbs.AST.Literal;
};

export type HelpersHash = Record<string, HelperDelegateFixed>;
export type PartialsHash = Record<string, TemplateFixed>;
export type DecoratorsHash = Record<string, DecoratorDelegate>;

// Use the post-fix `Fixed` to allow us to acces it inside the 'handlebars' module declared above
type TemplateFixed = TemplateDelegateFixed | string;
export type { TemplateFixed as Template };

export interface DecoratorOptions extends Omit<HelperOptions, 'lookupProperties'> {
  args?: any[];
}

export interface VisitorHelper {
  fn?: HelperDelegateFixed;
  context: any[];
  params: any[];
  options: AmbiguousHelperOptions;
}

export interface ResolvePartialOptions
  extends Omit<Handlebars.ResolvePartialOptions, 'helpers' | 'partials' | 'decorators'> {
  // The upstream `helpers` property is too loose and allows all functions.
  helpers?: HelpersHash;
  // The upstream `partials` property is incorrectly typed and doesn't allow
  // partials to be strings.
  partials?: PartialsHash;
  // The upstream `decorators` property is too loose and allows all functions.
  decorators?: DecoratorsHash;
}

export interface Container {
  helpers: HelpersHash;
  partials: PartialsHash;
  decorators: DecoratorsHash;
  strict: (obj: Record<string, any>, name: string, loc: hbs.AST.SourceLocation) => any;
  lookupProperty: LookupProperty;
  lambda: (current: any, context: any) => any;
  data: (value: any, depth: number) => any;
  hooks: {
    helperMissing?: HelperDelegateFixed;
    blockHelperMissing?: HelperDelegateFixed;
  };
}
