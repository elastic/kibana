import type { SavedObjectsClientContract, SavedObjectsFindOptions, SavedObjectsFindResponse } from '@kbn/core-saved-objects-api-server';
import type { asCodeSearchRequestSchema } from '@kbn/as-code-shared-schemas';
import type { TypeOf } from '@kbn/config-schema';
type TagSearchParams = Pick<TypeOf<typeof asCodeSearchRequestSchema>, 'tags' | 'excluded_tags' | 'tag_names' | 'excluded_tag_names'>;
/**
 * Runs a SO `find` with tag filtering resolved from search params. When `tag_names` were requested
 * but matched no tags, returns an empty response instead of querying — so callers never special-case
 * that: the empty result flows through their normal response mapping.
 */
export declare const findWithTagFilter: <T>(soClient: SavedObjectsClientContract, findOptions: SavedObjectsFindOptions, tagParams: TagSearchParams) => Promise<SavedObjectsFindResponse<T>>;
export {};
