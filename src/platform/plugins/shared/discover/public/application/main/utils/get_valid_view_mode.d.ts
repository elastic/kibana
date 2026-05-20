import { VIEW_MODE } from '@kbn/saved-search-plugin/public';
/**
 * Returns a valid view mode
 * @param viewMode
 * @param isEsqlMode
 */
export declare const getValidViewMode: ({ viewMode, isEsqlMode, }: {
    viewMode?: VIEW_MODE;
    isEsqlMode: boolean;
}) => VIEW_MODE | undefined;
