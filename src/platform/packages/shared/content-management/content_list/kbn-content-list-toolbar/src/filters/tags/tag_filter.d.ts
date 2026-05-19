export type { TagFilterProps } from '../part';
/**
 * `TagFilter` declarative component (non-rendering).
 *
 * This is a declarative component that doesn't render anything.
 * It specifies that a tag filter dropdown should appear in the toolbar filters.
 * The `resolve` callback checks whether tags are available and returns
 * a `SearchFilterConfig` wrapping {@link TagFilterRenderer}, or `undefined`
 * to skip the filter entirely.
 *
 * Tags must be enabled via the provider's `services.tags` configuration.
 *
 * @returns `null` - this component does not render anything.
 *
 * @example
 * ```tsx
 * <Filters>
 *   <Filters.Tags />
 *   <Filters.Sort />
 * </Filters>
 * ```
 */
export declare const TagFilter: import("react").FC<import("../part").TagFilterProps>;
