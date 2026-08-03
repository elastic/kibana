import type { FC } from 'react';
import type { Tag } from '../types';
/**
 * Props for the {@link TagBadge} component.
 */
export interface TagBadgeProps {
    /** The tag object to display. */
    tag: Tag;
    /**
     * Optional click handler. Called with the tag and a boolean indicating whether a modifier key
     * (Cmd on Mac, Ctrl on Windows/Linux) was held during the click.
     * @param tag - The clicked tag.
     * @param withModifierKey - Whether a modifier key was held during the click.
     */
    onClick?: (tag: Tag, withModifierKey: boolean) => void;
}
/**
 * Renders a tag as a colored EUI badge.
 *
 * This is the standard visual representation for tags in the content management UI.
 * The badge displays the tag name with its configured color and shows the description
 * as a tooltip on hover.
 *
 * When an `onClick` handler is provided, the badge becomes interactive and supports
 * modifier-key clicks (Cmd on macOS, Ctrl on Windows/Linux) for alternate actions
 * such as adding to an exclude filter instead of an include filter.
 *
 * @example
 * ```tsx
 * // Static badge (no interaction)
 * <TagBadge tag={myTag} />
 *
 * // Interactive badge with click handling
 * <TagBadge
 *   tag={myTag}
 *   onClick={(tag, withModifier) => {
 *     if (withModifier) {
 *       excludeTag(tag);
 *     } else {
 *       includeTag(tag);
 *     }
 *   }}
 * />
 * ```
 */
export declare const TagBadge: FC<TagBadgeProps>;
