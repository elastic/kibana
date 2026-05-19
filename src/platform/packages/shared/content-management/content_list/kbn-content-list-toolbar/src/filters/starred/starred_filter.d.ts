export type { StarredFilterProps } from '../part';
/**
 * `StarredFilter` declarative component (non-rendering).
 *
 * This is a declarative component that doesn't render anything.
 * It specifies that a starred toggle should appear in the toolbar filters.
 * The `resolve` callback checks whether starred is available and returns
 * a `SearchFilterConfig` wrapping {@link StarredFilterRenderer}, or `undefined`
 * to skip the filter entirely.
 *
 * Starred must be enabled via the provider's `services.favorites` configuration.
 *
 * @returns `null` - this component does not render anything.
 *
 * @example
 * ```tsx
 * <Filters>
 *   <Filters.Starred />
 *   <Filters.Tags />
 *   <Filters.Sort />
 * </Filters>
 * ```
 */
export declare const StarredFilter: import("react").FC<import("../part").StarredFilterProps>;
