/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { FC } from 'react';
/**
 * Generates the static property key (Symbol) for an assembly's part.
 *
 * Uses `Symbol.for()` to ensure the same Symbol is returned across module
 * boundaries, even if different versions of the package are loaded.
 *
 * @param assembly - The assembly name.
 * @returns A global Symbol for the part key.
 */
export declare const getPartKey: (assembly: string) => symbol;
/**
 * Generates the static property key (Symbol) for an assembly's preset.
 *
 * Uses `Symbol.for()` to ensure the same Symbol is returned across module
 * boundaries, even if different versions of the package are loaded.
 *
 * @param assembly - The assembly name.
 * @returns A global Symbol for the preset key.
 */
export declare const getPresetKey: (assembly: string) => symbol;
/**
 * Tags an existing component as a declarative component.
 *
 * Use this when you already have a component defined elsewhere. For most
 * cases, prefer {@link createDeclarativeComponent}.
 *
 * @param component - The component function to tag.
 * @param config - The declarative component configuration.
 * @returns The same component, now tagged with static Symbol properties.
 *
 * @example
 * ```typescript
 * import type { DeclarativeReturn } from '@kbn/content-list-assembly';
 *
 * const Spacer = (_props: SpacerProps): DeclarativeReturn => null;
 *
 * tagDeclarativeComponent(Spacer, {
 *   assembly: 'ActionBar',
 *   part: 'spacer',
 * });
 * ```
 */
export declare const tagDeclarativeComponent: <C extends (...args: any[]) => null>(
  component: C,
  config: {
    assembly: string;
    part: string;
    preset?: string;
  }
) => C;
/**
 * Creates a declarative component that returns `null`.
 *
 * Declarative components don't render anything; they exist to declare
 * configuration via props, which are extracted by parsing functions.
 *
 * The `displayName` is auto-generated from assembly/part/preset for
 * React DevTools.
 *
 * @template P - The component's props type.
 * @param config - Assembly, part, and optional preset names.
 * @returns A React functional component that returns `null`.
 */
export declare const createDeclarativeComponent: <P>(config: {
  assembly: string;
  part: string;
  preset?: string;
}) => FC<P>;
