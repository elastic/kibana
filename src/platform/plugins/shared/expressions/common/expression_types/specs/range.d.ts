import type { ExpressionTypeDefinition } from '../types';
declare const name = "range";
export interface Range {
    type: typeof name;
    from: number;
    to: number;
    label?: string;
}
export declare const range: ExpressionTypeDefinition<typeof name, Range>;
export {};
