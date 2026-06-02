import type { Ast, AstArgument, AstArgumentWithMeta } from './ast';
export interface ValueChange {
    type: 'value';
    source: AstArgumentWithMeta;
    target: AstArgument;
}
export type Change = ValueChange;
export declare function isValueChange(value: any): value is ValueChange;
export declare function compare(expression: string, ast: Ast): Change[];
