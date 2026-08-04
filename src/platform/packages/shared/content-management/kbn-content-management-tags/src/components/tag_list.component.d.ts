import type { FC } from 'react';
import type { Tag } from '../types';
/**
 * Props for the {@link TagListComponent}.
 */
export interface TagListComponentProps {
    /** Array of tag objects to render as badges. */
    tags: Tag[];
    /**
     * Optional click handler passed to each {@link TagBadge}. Called with the clicked tag and modifier key state.
     * @param tag - The clicked tag.
     * @param withModifierKey - Whether a modifier key was held during the click.
     */
    onClick?: (tag: Tag, withModifierKey: boolean) => void;
}
/**
 * Pure component that renders a horizontal list of tag badges.
 *
 * This is a presentational component that accepts pre-resolved tag objects.
 * For a connected version that resolves tag IDs via context, use {@link TagList}.
 *
 * The tags are rendered as {@link TagBadge} components in a flexbox layout
 * with wrapping enabled for responsive display.
 *
 * @returns The rendered tag list, or `null` if the tags array is empty.
 *
 * @example
 * ```tsx
 * <TagListComponent
 *   tags={[productionTag, frontendTag]}
 *   onClick={(tag, withModifier) => handleTagClick(tag, withModifier)}
 * />
 * ```
 */
export declare const TagListComponent: FC<TagListComponentProps>;
