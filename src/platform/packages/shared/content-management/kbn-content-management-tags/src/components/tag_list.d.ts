import { type FC } from 'react';
import { type TagListComponentProps } from './tag_list.component';
/**
 * Props for the {@link TagList} component.
 */
export interface TagListProps extends Pick<TagListComponentProps, 'onClick'> {
    /** Array of tag IDs to resolve and display. */
    tagIds: string[];
}
/**
 * Connected component that renders a list of tags by resolving tag IDs to tag objects.
 *
 * This component uses the {@link useTagServices | useServices} hook to access the tag list
 * from context and resolves the provided tag IDs to full {@link Tag} objects. The resolved
 * tags are then rendered using {@link TagListComponent}.
 *
 * Must be used within a {@link ContentManagementTagsProvider} or {@link ContentManagementTagsKibanaProvider}.
 * If no provider is present, the component renders nothing.
 *
 * @returns The rendered tag list, or an empty {@link TagListComponent} if services are unavailable.
 *
 * @example
 * ```tsx
 * // Render tags for a saved object
 * <TagList
 *   tagIds={savedObject.attributes.tags}
 *   onClick={(tag, withModifier) => filterByTag(tag, withModifier)}
 * />
 * ```
 */
export declare const TagList: FC<TagListProps>;
