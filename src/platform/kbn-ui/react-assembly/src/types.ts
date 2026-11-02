/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Internal type for accessing component static properties.
 *
 * Uses symbol keys for minification-safe identification via `Symbol.for()`.
 */
export interface DeclarativeComponentType {
  [key: symbol]: string | undefined;
  displayName?: string;
}

/**
 * Internal type for React-like element structure.
 */
export interface ReactLikeElement {
  type?: DeclarativeComponentType;
  props?: Record<string, unknown>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper types for defining declarative components
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Return type for declarative components.
 *
 * Prefer {@link DeclarativeComponent} when possible. Use `DeclarativeReturn`
 * directly when you need to hand-write the full function signature.
 *
 * @example
 * ```typescript
 * const Spacer = (_props: SpacerProps): DeclarativeReturn => null;
 * spacerPart.tagComponent(Spacer);
 * ```
 */
export type DeclarativeReturn = null;

/**
 * Function type for a non-generic declarative component.
 *
 * Shorthand for `(props: P) => null`. This is the recommended way to type
 * hand-written declarative components.
 *
 * @template P - The component's props type.
 *
 * @example
 * ```typescript
 * const MyControl: DeclarativeComponent<ControlProps> = (_props) => null;
 * ```
 */
export type DeclarativeComponent<P> = (props: P) => DeclarativeReturn;
