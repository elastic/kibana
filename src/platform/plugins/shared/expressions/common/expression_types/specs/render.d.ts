import type { ExpressionTypeDefinition, ExpressionValueBoxed } from '../types';
declare const name = "render";
/**
 * Represents an object that is intended to be rendered.
 */
export type ExpressionValueRender<T> = ExpressionValueBoxed<typeof name, {
    as: string;
    value: T;
}>;
/**
 * @deprecated
 *
 * Use `ExpressionValueRender` instead.
 */
export type Render<T> = ExpressionValueRender<T>;
export declare const render: ExpressionTypeDefinition<typeof name, ExpressionValueRender<unknown>>;
export {};
