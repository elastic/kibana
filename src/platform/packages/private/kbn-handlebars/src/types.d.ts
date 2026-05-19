import type { kHelper, kAmbiguous, kSimple } from './symbols';
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
    function compileAST(input: string | hbs.AST.Program, options?: CompileOptions): TemplateDelegateFixed;
    /**
     * A {@link https://handlebarsjs.com/api-reference/helpers.html helper-function} type.
     *
     * When registering a helper function, it should be of this type.
     */
    interface HelperDelegate extends HelperDelegateFixed {
    }
    /**
     * A template-function type.
     *
     * This type is primarily used for the return value of by calls to
     * {@link https://handlebarsjs.com/api-reference/compilation.html#handlebars-compile-template-options Handlebars.compile},
     * Handlebars.compileAST and {@link https://handlebarsjs.com/api-reference/compilation.html#handlebars-precompile-template-options Handlebars.template}.
     */
    interface TemplateDelegate<T = any> extends TemplateDelegateFixed<T> {
    }
    /**
     * Register one or more {@link https://handlebarsjs.com/api-reference/runtime.html#handlebars-registerpartial-name-partial partials}.
     *
     * @param spec A key/value object where each key is the name of a partial (a string) and each value is the partial (either a string or a partial function).
     */
    function registerPartial(spec: Record<string, TemplateFixed>): void;
}
/**
 * Supported Handlebars compile options.
 *
 * This is a subset of all the compile options supported by the upstream
 * Handlebars module.
 */
export type CompileOptions = Pick<HandlebarsCompileOptions, 'data' | 'knownHelpers' | 'knownHelpersOnly' | 'noEscape' | 'strict' | 'assumeObjects' | 'preventIndent' | 'explicitPartialContext'>;
/**
 * Supported Handlebars runtime options
 *
 * This is a subset of all the runtime options supported by the upstream
 * Handlebars module.
 */
export interface RuntimeOptions extends Pick<Handlebars.RuntimeOptions, 'data' | 'blockParams'> {
    helpers?: HelpersHash;
    partials?: PartialsHash;
    decorators?: DecoratorsHash;
}
/**
 * The last argument being passed to a helper function is a an {@link https://handlebarsjs.com/api-reference/helpers.html#the-options-parameter options object}.
 */
export interface HelperOptions extends Omit<Handlebars.HelperOptions, 'fn' | 'inverse'> {
    name: string;
    fn: TemplateDelegateFixed;
    inverse: TemplateDelegateFixed;
    loc: {
        start: hbs.AST.SourceLocation['start'];
        end: hbs.AST.SourceLocation['end'];
    };
    lookupProperty: LookupProperty;
}
/**
 * A {@link https://handlebarsjs.com/api-reference/helpers.html helper-function} type.
 *
 * When registering a helper function, it should be of this type.
 */
interface HelperDelegateFixed {
    (...params: any[]): any;
}
export type { HelperDelegateFixed as HelperDelegate };
/**
 * A template-function type.
 *
 * This type is primarily used for the return value of by calls to
 * {@link https://handlebarsjs.com/api-reference/compilation.html#handlebars-compile-template-options Handlebars.compile},
 * Handlebars.compileAST and {@link https://handlebarsjs.com/api-reference/compilation.html#handlebars-precompile-template-options Handlebars.template}.
 */
interface TemplateDelegateFixed<T = any> {
    (context?: T, options?: RuntimeOptions): string;
    blockParams?: number;
    partials?: PartialsHash;
}
export type { TemplateDelegateFixed as TemplateDelegate };
/**
 * A {@link https://github.com/handlebars-lang/handlebars.js/blob/master/docs/decorators-api.md decorator-function} type.
 *
 * When registering a decorator function, it should be of this type.
 */
export type DecoratorDelegate = (prog: TemplateDelegateFixed, props: Record<string, any>, container: Container, options: any) => any;
export type NodeType = typeof kHelper | typeof kAmbiguous | typeof kSimple;
type LookupProperty = <T = any>(parent: Record<string, any>, propertyName: string) => T;
export type NonBlockHelperOptions = Omit<HelperOptions, 'fn' | 'inverse'>;
export type AmbiguousHelperOptions = HelperOptions | NonBlockHelperOptions;
export type ProcessableStatementNode = hbs.AST.MustacheStatement | hbs.AST.PartialStatement | hbs.AST.SubExpression;
export type ProcessableBlockStatementNode = hbs.AST.BlockStatement | hbs.AST.PartialBlockStatement;
export type ProcessableNode = ProcessableStatementNode | ProcessableBlockStatementNode;
export type ProcessableNodeWithPathParts = ProcessableNode & {
    path: hbs.AST.PathExpression;
};
export type ProcessableNodeWithPathPartsOrLiteral = ProcessableNode & {
    path: hbs.AST.PathExpression | hbs.AST.Literal;
};
export type HelpersHash = Record<string, HelperDelegateFixed>;
export type PartialsHash = Record<string, TemplateFixed>;
export type DecoratorsHash = Record<string, DecoratorDelegate>;
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
export interface ResolvePartialOptions extends Omit<Handlebars.ResolvePartialOptions, 'helpers' | 'partials' | 'decorators'> {
    helpers?: HelpersHash;
    partials?: PartialsHash;
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
