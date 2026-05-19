/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { FC, ReactNode } from 'react';
import type { ParsedItem, ParsedPart } from './parsing';
import type { SkeletonOutput } from './skeleton';
/**
 * Factory for creating parts within an assembly.
 *
 * Created by {@link AssemblyFactory.definePart}. Provides methods to
 * create preset components, generic components, and to tag existing
 * components with assembly metadata.
 *
 * @template TPresetMap - Mapping of preset names to their props types.
 * @template TOutput - Return type of `resolve`. Defaults to `ReactNode`.
 *   Override when the output is a data structure rather than JSX
 *   (e.g., `EuiBasicTableColumn<ContentListItem>`).
 * @template TContext - Runtime state passed to every `resolve` callback.
 *   Defaults to `void` (no context needed). Use this when resolve callbacks
 *   need ambient state that isn't part of the declared attributes -- for example,
 *   provider configuration, feature flags, or locale. The assembly component
 *   assembles the context from hooks and passes it to `resolve` at call time.
 *   See Recipe 8 in `RECIPES.md` for a worked example.
 */
export interface PartFactory<
  TPresetMap extends object = Record<string, unknown>,
  TOutput = ReactNode,
  TContext = void
> {
  /**
   * Create a preset component. The props type is inferred from the
   * preset-to-props mapping provided to `definePart`.
   *
   * Optionally provide a `resolve` callback that converts declarative
   * attributes into concrete output (e.g., an `EuiBasicTableColumn`).
   * The callback is stored internally and invoked by {@link resolve}.
   *
   * Optionally provide a `skeleton` callback that describes the shape of a
   * loading placeholder for this preset (used by renderers to draw a
   * column-aware skeleton during initial load). When omitted, the renderer
   * falls back to its own inference rules. See {@link resolveSkeleton}.
   *
   * @template K - The preset name (inferred from `definition.name`).
   * @param definition - The preset definition.
   * @param definition.name - Preset name, constrained to `keyof TPresetMap`.
   * @param definition.resolve - Optional callback to resolve attributes into output.
   *   Return `undefined` to signal that the part should be skipped (e.g., disabled).
   * @param definition.skeleton - Optional callback returning a skeleton shape
   *   descriptor for this preset. Return `undefined` to defer to renderer inference.
   * @returns An `FC` whose props type is `TPresetMap[K]`.
   */
  createPreset: <K extends keyof TPresetMap & string>(definition: {
    name: K;
    resolve?: (attributes: TPresetMap[K], context: TContext) => TOutput | undefined;
    skeleton?: (attributes: TPresetMap[K], context: TContext) => SkeletonOutput | undefined;
  }) => FC<TPresetMap[K]>;
  /**
   * Resolve a parsed part into concrete output by dispatching to the
   * `resolve` callback registered via `createPreset` or `createComponent`.
   *
   * Checks preset resolvers first. If no preset resolver matches, falls
   * back to the component resolver registered via `createComponent({ resolve })`.
   * Returns `undefined` if no resolver handles the part.
   *
   * @param part - A parsed part from `parseChildren`.
   * @param context - Context passed through to the resolve callback.
   * @returns The resolved output, or `undefined`.
   */
  resolve: (part: ParsedPart, context: TContext) => TOutput | undefined;
  /**
   * Resolve a parsed part into its skeleton shape descriptor by dispatching
   * to the `skeleton` callback registered via `createPreset` or
   * `createComponent`.
   *
   * Returns `undefined` when no skeleton resolver is registered for this
   * preset or custom component — renderers should treat that as "fall back
   * to inference" rather than an error.
   *
   * @param part - A parsed part from `parseChildren`.
   * @param context - Context passed through to the skeleton callback.
   * @returns The skeleton shape descriptor, or `undefined`.
   */
  resolveSkeleton: (part: ParsedPart, context: TContext) => SkeletonOutput | undefined;
  /**
   * Parse React children and filter to this part type.
   *
   * Equivalent to calling `assembly.parseChildren(children)` and filtering
   * to `item.type === 'part' && item.part === thisPartName`. Use this
   * instead of importing the assembly factory directly.
   *
   * @param children - React children to parse.
   * @returns Parsed parts belonging to this part type, in source order.
   */
  parseChildren: (children: ReactNode) => ParsedPart[];
  /**
   * Create a component without a preset (e.g., custom columns or custom filters).
   *
   * Each call returns a **unique** `FC` reference. When a `resolve` or `skeleton`
   * callback is provided, it is bound exclusively to that component reference.
   * This means multiple `createComponent` calls for the same part — e.g. two
   * `RecentsFilter` instances from different history sources — each dispatch to
   * their own resolver independently. The resolver is looked up from the
   * component function carried on the parsed part (`ParsedPart.componentType`),
   * so there is no global shared slot that can be overwritten.
   *
   * @template P - The component's props type.
   * @param options - Optional configuration.
   * @param options.resolve - Resolver bound to this specific component instance.
   *   Return `undefined` to signal that the part should be skipped.
   * @param options.skeleton - Skeleton resolver bound to this specific component instance.
   *   Return `undefined` to defer to renderer inference.
   * @returns An `FC<P>` that returns `null`.
   */
  createComponent: <P>(options?: {
    resolve?: (attributes: P, context: TContext) => TOutput | undefined;
    skeleton?: (attributes: P, context: TContext) => SkeletonOutput | undefined;
  }) => FC<P>;
  /**
   * Tag an existing component with assembly metadata.
   *
   * Use this when the component needs its own generic type parameter
   * and cannot be created via `createPreset` or `createComponent`.
   *
   * @template C - The component function type.
   * @param component - The component function to tag.
   * @param options - Optional preset name.
   * @returns The same component, now tagged with static Symbol properties.
   */
  tagComponent: <C extends (...args: any[]) => null>(
    component: C,
    options?: {
      preset?: keyof TPresetMap & string;
    }
  ) => C;
}
/**
 * Factory for defining parts and parsing children within an assembly.
 *
 * Created by {@link defineAssembly}. Provides `definePart` for creating
 * typed part factories and `parseChildren` for extracting configuration
 * from React children.
 *
 * @template TName - String literal type of the assembly name.
 */
export interface AssemblyFactory<TName extends string = string> {
  /** The assembly name (literal type preserved). */
  readonly name: TName;
  /**
   * Define a part within this assembly.
   *
   * @template TPresetMap - Mapping of preset names to their props types.
   * @template TOutput - Return type of `resolve`. Defaults to `ReactNode`.
   * @template TContext - Runtime state for `resolve` callbacks. Defaults to `void`.
   * @param partDefinition - The part definition.
   * @param partDefinition.name - Part name (e.g., `'column'`, `'filter'`).
   * @returns A {@link PartFactory} for creating presets and components.
   *
   * @example Simple part (attributes → ReactNode, no context):
   * ```typescript
   * const button = actionBar.definePart<ButtonPresets>({ name: 'button' });
   * ```
   *
   * @example Part with non-JSX output and runtime context:
   * ```typescript
   * const column = table.definePart<
   *   ColumnPresets,
   *   EuiBasicTableColumn<ContentListItem>,
   *   ColumnBuilderContext
   * >({ name: 'column' });
   * ```
   */
  definePart: <
    TPresetMap extends object = Record<string, unknown>,
    TOutput = ReactNode,
    TContext = void
  >(partDefinition: {
    name: string;
  }) => PartFactory<TPresetMap, TOutput, TContext>;
  /**
   * Parse React children for declarative components in this assembly.
   *
   * Returns a flat array in source order. Each item is either a
   * `ParsedPart` (with `part`, `preset`, `instanceId`, `attributes`) or
   * a `ParsedChild` passthrough. Use the `type` field to discriminate.
   *
   * All part types in the assembly are matched in a single pass.
   * Filter by `item.part` to scope to a specific part type.
   *
   * In development, warns for function component children that are not
   * registered parts. Pass `{ supportsOtherChildren: true }` to suppress
   * the warning when the renderer intentionally handles non-part children.
   *
   * @param children - React children to parse.
   * @param options - Optional parsing options.
   * @param options.supportsOtherChildren - When `true`, suppresses the
   *   dev-mode warning for unrecognized function component children.
   *   Use this when the assembly renderer intentionally renders
   *   non-part children.
   * @returns Flat array of parsed items in source order.
   */
  parseChildren: (
    children: ReactNode,
    options?: {
      supportsOtherChildren?: boolean;
    }
  ) => ParsedItem[];
}
/**
 * Define a new assembly.
 *
 * Returns an {@link AssemblyFactory} that provides `definePart()` for
 * creating typed part factories and `parseChildren()` for extracting
 * configuration from React children.
 *
 * @template TName - String literal type of the assembly name.
 * @param config - Assembly configuration.
 * @param config.name - The assembly name (e.g., `'ContentListTable'`).
 * @returns An assembly factory.
 *
 * @example
 * ```typescript
 * const table = defineAssembly({ name: 'ContentListTable' });
 *
 * interface ColumnPresets extends Record<string, unknown> {
 *   name: NameColumnProps;
 *   updatedAt: UpdatedAtColumnProps;
 * }
 *
 * const column = table.definePart<ColumnPresets>({ name: 'column' });
 * const NameColumn = column.createPreset({
 *   name: 'name',
 *   resolve: (attributes) => buildNameColumn(attributes),
 * });
 *
 * // Parse children and resolve:
 * const items = table.parseChildren(children);
 * const columns = items
 *   .filter(item => item.type === 'part' && item.part === 'column')
 *   .map(item => column.resolve(item));
 * ```
 */
export declare const defineAssembly: <const TName extends string>(config: {
  name: TName;
}) => AssemblyFactory<TName>;
