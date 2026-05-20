import type { FC } from 'react';
import type { UserContentCommonSchema } from '@kbn/content-management-table-list-view-common';
/**
 * This component is used as an extension for the ContentEditor to render the ActivityView and ViewsStats inside the flyout without depending on them directly
 */
export declare const ContentEditorActivityRow: FC<{
    item: UserContentCommonSchema;
    entityNamePlural?: string;
}>;
