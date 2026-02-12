import { Handlebars } from './src/handlebars';
export default Handlebars;
/**
 * If the `unsafe-eval` CSP is set, this string constant will be `compile`,
 * otherwise `compileAST`.
 *
 * This can be used to call the more optimized `compile` function in
 * environments that support it, or fall back to `compileAST` on environments
 * that don't.
 */
export declare const compileFnName: 'compile' | 'compileAST';
export type { CompileOptions, RuntimeOptions, HelperDelegate, TemplateDelegate, DecoratorDelegate, HelperOptions, } from './src/types';
