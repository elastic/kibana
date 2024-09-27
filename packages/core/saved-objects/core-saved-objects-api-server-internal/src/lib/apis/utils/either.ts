/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

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
export const left = <L>(value: L): Left<L> => ({
  tag: 'Left',
  value,
});

/**
 * Returns a {@link Right} part holding the provided value.
 * @internal
 */
export const right = <R>(value: R): Right<R> => ({
  tag: 'Right',
  value,
});

/**
 * Type guard for left part of discriminated union ({@link Left}, {@link Either}).
 * @internal
 */
export const isLeft = <L, R>(either: Either<L, R>): either is Left<L> => either.tag === 'Left';
/**
 * Type guard for right part of discriminated union ({@link Right}, {@link Either}).
 * @internal
 */
export const isRight = <L, R>(either: Either<L, R>): either is Right<R> => either.tag === 'Right';
