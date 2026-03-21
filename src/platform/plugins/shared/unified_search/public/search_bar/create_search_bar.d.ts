import React from 'react';
import type { CoreStart } from '@kbn/core/public';
import type { IStorageWrapper } from '@kbn/kibana-utils-plugin/public';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { KqlPluginStart } from '@kbn/kql/public';
import type { Query, AggregateQuery } from '@kbn/es-query';
import type { Filter } from '@kbn/es-query';
import type { UsageCollectionSetup } from '@kbn/usage-collection-plugin/public';
import type { CPSPluginStart } from '@kbn/cps/public';
import type { SearchBarOwnProps } from '.';
export interface StatefulSearchBarDeps {
    core: CoreStart;
    data: DataPublicPluginStart;
    storage: IStorageWrapper;
    usageCollection?: UsageCollectionSetup;
    isScreenshotMode?: boolean;
    kql: {
        autocomplete: KqlPluginStart['autocomplete'];
    };
    cps: CPSPluginStart;
}
export type StatefulSearchBarProps<QT extends Query | AggregateQuery = Query> = Omit<SearchBarOwnProps<QT>, 'showSaveQuery'> & {
    appName: string;
    useDefaultBehaviors?: boolean;
    disableSubscribingToGlobalDataServices?: boolean;
    savedQueryId?: string;
    /**
     * Determines if saving queries is allowed within the saved query management popover (still requires privileges).
     * This does not impact if queries can be loaded, which is determined by the saved query management read privilege.
     * Defaults to false.
     */
    allowSavingQueries?: boolean;
    onSavedQueryIdChange?: (savedQueryId?: string) => void;
    onFiltersUpdated?: (filters: Filter[]) => void;
};
export declare function createSearchBar({ core, storage, data, usageCollection, isScreenshotMode, kql, cps, }: StatefulSearchBarDeps): <QT extends AggregateQuery | Query = Query>(props: StatefulSearchBarProps<QT>) => React.JSX.Element;
