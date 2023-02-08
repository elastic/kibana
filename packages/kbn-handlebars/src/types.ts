/*
 * Elasticsearch B.V licenses this file to you under the MIT License.
 * See `packages/kbn-handlebars/LICENSE` for more information.
 */

import { kHelper, kAmbiguous, kSimple } from './symbols';

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
    partials?: any; // TODO: Narrow type to something better than any?
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

  export function registerPartial(spec: { [name: string]: Handlebars.Template }): void; // Ensure `spec` object values can be strings
}

export type NodeType = typeof kHelper | typeof kAmbiguous | typeof kSimple;

type LookupProperty = <T = any>(parent: { [name: string]: any }, propertyName: string) => T;

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

export interface Helper {
  fn?: Handlebars.HelperDelegate;
  context: any[];
  params: any[];
  options: AmbiguousHelperOptions;
}

export type NonBlockHelperOptions = Omit<Handlebars.HelperOptions, 'fn' | 'inverse'>;
export type AmbiguousHelperOptions = Handlebars.HelperOptions | NonBlockHelperOptions;

export interface DecoratorOptions extends Omit<Handlebars.HelperOptions, 'lookupProperties'> {
  args?: any[];
}

/**
 * Supported Handlebars compile options.
 *
 * This is a subset of all the compile options supported by the upstream
 * Handlebars module.
 */
export type ExtendedCompileOptions = Pick<
  CompileOptions,
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
export type ExtendedRuntimeOptions = Pick<
  RuntimeOptions,
  'data' | 'helpers' | 'partials' | 'decorators' | 'blockParams'
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

export interface PartialsHash {
  [name: string]: HandlebarsTemplateDelegate;
}

export interface DecoratorsHash {
  [name: string]: DecoratorFunction;
}

export interface Container {
  helpers: HelpersHash;
  partials: PartialsHash;
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
