import type { ExpressionTypeDefinition } from '../types';
declare const name = "image";
export interface ExpressionImage {
    type: 'image';
    mode: string;
    dataurl: string;
}
export declare const image: ExpressionTypeDefinition<typeof name, ExpressionImage>;
export {};
