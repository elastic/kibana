import type { AstNode } from './ast';
interface Options {
    /**
     * Node type.
     */
    type?: 'argument' | 'expression' | 'function';
    /**
     * Original expression to apply the new AST to.
     * At the moment, only arguments values changes are supported.
     */
    source?: string;
}
export declare function toExpression(ast: AstNode, options?: string | Options): string;
export {};
