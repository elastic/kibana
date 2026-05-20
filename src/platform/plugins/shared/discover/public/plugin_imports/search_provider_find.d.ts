import type { GlobalSearchProviderResult, GlobalSearchResultProvider } from '@kbn/global-search-plugin/public';
import { type CoreStart } from '@kbn/core/public';
import type { DiscoverAppLocator } from '../../common';
import type { DiscoverStartPlugins } from '../types';
export declare const searchProviderFind: (options: {
    isESQLEnabled: boolean;
    locator?: DiscoverAppLocator;
    getServices: () => Promise<[CoreStart, DiscoverStartPlugins]>;
}, ...findParams: Parameters<GlobalSearchResultProvider['find']>) => Promise<GlobalSearchProviderResult[]>;
