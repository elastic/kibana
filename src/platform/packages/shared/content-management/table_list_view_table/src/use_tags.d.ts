import type { Query } from '@elastic/eui';
import type { UserContentCommonSchema } from '@kbn/content-management-table-list-view-common';
import type { SearchQueryError, Tag } from './types';
export declare function useTags({ query, updateQuery, items, }: {
    query: Query;
    updateQuery: (query: Query, error: SearchQueryError | null) => void;
    items: UserContentCommonSchema[];
}): {
    addOrRemoveIncludeTagFilter: (tag: Tag) => void;
    addOrRemoveExcludeTagFilter: (tag: Tag) => void;
    clearTagSelection: () => (query: Query, error: SearchQueryError | null) => void;
    tagsToTableItemMap: {
        [tagId: string]: string[];
    };
};
