/**
 * Discriminated union (TypeScript approximation of an algebraic data type); this design pattern is used for internal repository operations.
 * @internal
 */
export type Either<L = unknown, R = L> = Left<L> | Right<R>;
/**
 * Left part of discriminated union ({@link Either}).
 * @internal
 */
export interface Left<L> {
    tag: 'Left';
    value: L;
}
/**
 * Right part of discriminated union ({@link Either}).
 * @internal
 */
export interface Right<R> {
    tag: 'Right';
    value: R;
}
/**
 * Returns a {@link Left} part holding the provided value.
 * @internal
 */
export declare const left: <L>(value: L) => Left<L>;
/**
 * Returns a {@link Right} part holding the provided value.
 * @internal
 */
export declare const right: <R>(value: R) => Right<R>;
/**
 * Type guard for left part of discriminated union ({@link Left}, {@link Either}).
 * @internal
 */
export declare const isLeft: <L, R>(either: Either<L, R>) => either is Left<L>;
/**
 * Type guard for right part of discriminated union ({@link Right}, {@link Either}).
 * @internal
 */
export declare const isRight: <L, R>(either: Either<L, R>) => either is Right<R>;
