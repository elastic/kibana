import type { Template } from '@kbn/workflows-library';
export interface CatalogFilters {
    /** Free-text match against name + description + categories. */
    search?: string;
    /** A template matches when its `categories` array intersects this list. */
    categories?: string[];
    /**
     * A template matches when it declares no `solutions` (cross-solution) or when
     * its `solutions` array includes this value.
     */
    solution?: string;
}
/**
 * Pure client-side filter over a full catalog fetch. Mirrors the server's
 * `filterTemplates` (`workflows_management/server/library/library_service.ts`)
 * so behavior is consistent whether filtering happens server- or client-side.
 */
export declare function filterCatalog(templates: Template[], filters?: CatalogFilters): Template[];
