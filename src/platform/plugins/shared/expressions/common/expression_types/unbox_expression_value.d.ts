import type { ExpressionValueBoxed } from './types';
export declare function unboxExpressionValue<T extends object>({ type, ...value }: ExpressionValueBoxed<string, T>): T;
