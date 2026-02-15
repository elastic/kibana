/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isValidElement } from 'react';
import type { FC, ReactNode } from 'react';
import type { ParsedItem, ParsedPart } from './parsing';
import { parseDeclarativeChildren } from './parsing';
import { createDeclarativeComponent, tagDeclarativeComponent } from './factory';

// ─────────────────────────────────────────────────────────────────────────────
// Dev-mode warning helper
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Dev-mode helper: warns for function component children that are not
 * registered parts. Only checks `{ type: 'child' }` items whose `node`
 * is a React element with a function component type. Intrinsic HTML
 * elements (e.g., `<div>`) are ignored.
 *
 * @param items - Parsed items from `parseDeclarativeChildren`.
 * @param assemblyName - The assembly name for the warning prefix.
 * @param scope - The scope name (part or assembly) for the warning message.
 */
const warnOnPassthroughComponents = (
  items: ParsedItem[],
  assemblyName: string,
  scope: string
): void => {
  if (process.env.NODE_ENV !== 'production') {
    for (const item of items) {
      if (
        item.type === 'child' &&
        isValidElement(item.node) &&
        typeof item.node.type === 'function'
      ) {
        const name =
          (item.node.type as unknown as { displayName?: string }).displayName ||
          item.node.type.name ||
          'Unknown';
        // eslint-disable-next-line no-console
        console.warn(
          `[${assemblyName}] <${name}> is not a registered "${scope}" part and may not be rendered.`
        );
      }
    }
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// PartFactory
// ─────────────────────────────────────────────────────────────────────────────

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
   * @template K - The preset name (inferred from `definition.name`).
   * @param definition - The preset definition.
   * @param definition.name - Preset name, constrained to `keyof TPresetMap`.
   * @param definition.resolve - Optional callback to resolve attributes into output.
   *   Return `undefined` to signal that the part should be skipped (e.g., disabled).
   * @returns An `FC` whose props type is `TPresetMap[K]`.
   */
  createPreset: <K extends keyof TPresetMap & string>(definition: {
    name: K;
    resolve?: (attributes: TPresetMap[K], context: TContext) => TOutput | undefined;
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
   * Create a component without a preset (e.g., custom columns).
   *
   * Use this for parts that get their identity from `props.id` rather
   * than a static preset name. Optionally provide a `resolve` callback
   * to handle custom parts in `part.resolve()`, eliminating the need
   * for manual casts in consumer code.
   *
   * @template P - The component's props type.
   * @param options - Optional configuration.
   * @param options.resolve - Fallback resolver for parts without a preset.
   *   Return `undefined` to signal that the part should be skipped.
   * @returns An `FC<P>` that returns `null`.
   */
  createComponent: <P>(options?: {
    resolve?: (attributes: P, context: TContext) => TOutput | undefined;
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
    options?: { preset?: keyof TPresetMap & string }
  ) => C;
}

// ─────────────────────────────────────────────────────────────────────────────
// AssemblyFactory
// ─────────────────────────────────────────────────────────────────────────────

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
    options?: { supportsOtherChildren?: boolean }
  ) => ParsedItem[];
}

// ─────────────────────────────────────────────────────────────────────────────
// defineAssembly
// ─────────────────────────────────────────────────────────────────────────────

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
export const defineAssembly = <const TName extends string>(config: {
  name: TName;
}): AssemblyFactory<TName> => ({
  name: config.name,

  parseChildren: (
    children: ReactNode,
    options?: { supportsOtherChildren?: boolean }
  ): ParsedItem[] => {
    const items = parseDeclarativeChildren(children, config.name);
    if (!options?.supportsOtherChildren) {
      warnOnPassthroughComponents(items, config.name, config.name);
    }
    return items;
  },

  definePart: <
    TPresetMap extends object = Record<string, unknown>,
    TOutput = ReactNode,
    TContext = void
  >(partDefinition: {
    name: string;
  }): PartFactory<TPresetMap, TOutput, TContext> => {
    // Internal map of preset name → resolve callback. The cast from
    // `TPresetMap[K]` to `Record<string, unknown>` is safe by construction:
    // the preset's attributes type is guaranteed to match by the generic.
    const resolvers = new Map<
      string,
      (attributes: Record<string, unknown>, context: TContext) => TOutput | undefined
    >();

    // Fallback resolver for custom parts (registered via `createComponent`).
    let customResolver:
      | ((attributes: Record<string, unknown>, context: TContext) => TOutput | undefined)
      | undefined;

    return {
      createPreset: <K extends keyof TPresetMap & string>(definition: {
        name: K;
        resolve?: (attributes: TPresetMap[K], context: TContext) => TOutput | undefined;
      }): FC<TPresetMap[K]> => {
        if (definition.resolve) {
          resolvers.set(
            definition.name,
            definition.resolve as (
              attributes: Record<string, unknown>,
              context: TContext
            ) => TOutput | undefined
          );
        }

        return createDeclarativeComponent<TPresetMap[K]>({
          assembly: config.name,
          part: partDefinition.name,
          preset: definition.name,
        });
      },

      resolve: (part: ParsedPart, context: TContext): TOutput | undefined => {
        // Preset resolvers take priority.
        const resolver = part.preset ? resolvers.get(part.preset) : undefined;
        if (resolver) return resolver(part.attributes, context);

        // Fall back to the custom component resolver.
        if (customResolver) return customResolver(part.attributes, context);

        if (process.env.NODE_ENV !== 'production') {
          // eslint-disable-next-line no-console
          console.warn(
            `[${config.name}] No resolver found for part "${partDefinition.name}"` +
              (part.preset ? ` preset "${part.preset}"` : '') +
              `. If this part was wrapped with React.memo() or an HOC, ensure static properties are hoisted.`
          );
        }

        return undefined;
      },

      parseChildren: (children: ReactNode): ParsedPart[] => {
        const items = parseDeclarativeChildren(children, config.name);
        warnOnPassthroughComponents(items, config.name, partDefinition.name);

        return items.filter(
          (item): item is ParsedPart => item.type === 'part' && item.part === partDefinition.name
        );
      },

      createComponent: <P>(options?: {
        resolve?: (attributes: P, context: TContext) => TOutput | undefined;
      }): FC<P> => {
        if (options?.resolve) {
          if (process.env.NODE_ENV !== 'production' && customResolver) {
            // eslint-disable-next-line no-console
            console.warn(
              `[${config.name}] createComponent({ resolve }) called more than once ` +
                `for part "${partDefinition.name}". The previous custom resolver will be overwritten.`
            );
          }

          customResolver = options.resolve as (
            attributes: Record<string, unknown>,
            context: TContext
          ) => TOutput | undefined;
        }

        return createDeclarativeComponent<P>({
          assembly: config.name,
          part: partDefinition.name,
        });
      },

      tagComponent: <C extends (...args: any[]) => null>(
        component: C,
        options?: { preset?: keyof TPresetMap & string }
      ): C =>
        tagDeclarativeComponent(component, {
          assembly: config.name,
          part: partDefinition.name,
          preset: options?.preset,
        }),
    };
  },
});
