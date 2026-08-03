import React from 'react';
import { type Tag } from '@kbn/content-management-tags';
export interface NameCellTagsProps {
    /** Tag IDs to render. */
    tagIds: string[];
    /**
     * Optional override for the tag click handler.
     * When omitted, the built-in handler toggles include/exclude
     * filters via {@link useTagFilterToggle}.
     */
    onTagClick?: (tag: Tag, withModifierKey: boolean) => void;
}
/**
 * Renders tag badges below the title/description in the name cell.
 *
 * Provides a built-in click handler that toggles tag filters on the
 * content list state:
 * - **Click**: toggles the tag as an include filter.
 * - **Modifier+click** (Cmd on macOS, Ctrl on Windows/Linux): toggles
 *   the tag as an exclude filter.
 *
 * Consumers can override this behavior via the `onTagClick` prop.
 */
export declare const NameCellTags: React.MemoExoticComponent<({ tagIds, onTagClick }: NameCellTagsProps) => React.JSX.Element | null>;
