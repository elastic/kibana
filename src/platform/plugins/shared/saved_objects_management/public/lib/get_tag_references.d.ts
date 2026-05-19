import type { SavedObjectsFindOptionsReference } from '@kbn/core/server';
import type { SavedObjectsTaggingApi } from '@kbn/saved-objects-tagging-oss-plugin/public';
export declare const getTagFindReferences: ({ selectedTags, taggingApi, }: {
    selectedTags?: string[];
    taggingApi?: SavedObjectsTaggingApi;
}) => SavedObjectsFindOptionsReference[] | undefined;
