import type { CoreStart } from '@kbn/core/public';
import type { GlobalSearchResultProvider } from '@kbn/global-search-plugin/public';
import type { DiscoverAppLocator } from '../../common';
import type { DiscoverStartPlugins } from '../types';
/**
 * Global search provider adding an ES|QL and ESQL entry.
 * This is necessary because ES|QL is part of the Discover application.
 *
 * It navigates to Discover with a default query extracted from the default dataview
 */
export declare const getESQLSearchProvider: (options: {
    isESQLEnabled: boolean;
    locator?: DiscoverAppLocator;
    getServices: () => Promise<[CoreStart, DiscoverStartPlugins]>;
}) => GlobalSearchResultProvider;
