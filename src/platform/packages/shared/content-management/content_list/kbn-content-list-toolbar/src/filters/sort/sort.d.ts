export type { SortFilterProps } from '../part';
/**
 * `SortFilter` declarative component (non-rendering).
 *
 * This is a declarative component that doesn't render anything.
 * It specifies that a sort dropdown should appear in the toolbar filters.
 * The `resolve` callback checks whether sorting is available and returns
 * a `SearchFilterConfig` wrapping {@link SortRenderer}, or `undefined`
 * to skip the filter entirely.
 *
 * Sort options are configured via the provider's `sorting` config.
 *
 * @returns `null` - this component does not render anything.
 *
 * @example
 * ```tsx
 * <Filters>
 *   <Filters.Sort />
 * </Filters>
 * ```
 */
export declare const SortFilter: import("react").FC<import("../part").SortFilterProps>;
