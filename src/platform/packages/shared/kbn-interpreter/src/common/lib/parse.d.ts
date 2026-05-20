import type { Ast, AstWithMeta } from './ast';
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
declare const typedParse: any;
export { typedParse as parse };
