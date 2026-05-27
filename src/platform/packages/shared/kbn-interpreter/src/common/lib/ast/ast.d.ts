export type AstNode = Ast | AstFunction | AstArgument;
export type Ast = {
    type: 'expression';
    chain: AstFunction[];
};
export type AstFunction = {
    type: 'function';
    function: string;
    arguments: Record<string, AstArgument[]>;
};
export type AstArgument = string | boolean | number | Ast;
interface WithMeta<T> {
    start: number;
    end: number;
    text: string;
    node: T;
}
type Replace<T, R> = Pick<T, Exclude<keyof T, keyof R>> & R;
type WrapAstArgumentWithMeta<T> = T extends Ast ? AstWithMeta : WithMeta<T>;
export type AstArgumentWithMeta = WrapAstArgumentWithMeta<AstArgument>;
export type AstFunctionWithMeta = WithMeta<Replace<AstFunction, {
    arguments: {
        [key: string]: AstArgumentWithMeta[];
    };
}>>;
export type AstWithMeta = WithMeta<Replace<Ast, {
    chain: AstFunctionWithMeta[];
}>>;
export declare function isAstWithMeta(value: any): value is AstWithMeta;
export declare function isAst(value: any): value is Ast;
export {};
