import type { Ast, AstWithMeta } from './ast';
import { parse } from './grammar.peggy';
interface Options {
    startRule?: string;
}
interface OptionsWithMeta extends Options {
    addMeta: true;
}
export interface Parse {
    (input: string, options?: Options): Ast;
    (input: string, options: OptionsWithMeta): AstWithMeta;
}
declare const typedParse: typeof parse;
export { typedParse as parse };
