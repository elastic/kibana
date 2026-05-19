import type { EuiBasicTableColumn } from '@elastic/eui';
import type { CoreStart } from '@kbn/core/public';
import React from 'react';
import type { SearchSessionsMgmtAPI } from '../../lib/api';
import type { BackgroundSearchOpenedHandler, LocatorsStart, UISession } from '../../types';
import type { OnActionComplete } from './actions';
import type { SearchUsageCollector } from '../../../../collectors';
import type { SearchSessionsConfigSchema } from '../../../../../../server/config';
import type { ISearchSessionEBTManager } from '../../../ebt_manager';
interface Props {
    core: CoreStart;
    locators: LocatorsStart;
    api: SearchSessionsMgmtAPI;
    searchSessionEBTManager: ISearchSessionEBTManager;
    timezone: string;
    config: SearchSessionsConfigSchema;
    kibanaVersion: string;
    searchUsageCollector: SearchUsageCollector;
    hideRefreshButton?: boolean;
    appId?: string;
    onBackgroundSearchOpened?: BackgroundSearchOpenedHandler;
    getColumns?: (params: {
        core: CoreStart;
        api: SearchSessionsMgmtAPI;
        config: SearchSessionsConfigSchema;
        timezone: string;
        kibanaVersion: string;
        searchUsageCollector: SearchUsageCollector;
        onActionComplete: OnActionComplete;
        onBackgroundSearchOpened?: BackgroundSearchOpenedHandler;
    }) => Array<EuiBasicTableColumn<UISession>>;
    trackingProps: {
        openedFrom: string;
        renderedIn: string;
    };
}
export type GetColumnsFn = Props['getColumns'];
export declare function SearchSessionsMgmtTable({ core, locators, api, timezone, config, searchSessionEBTManager, kibanaVersion, searchUsageCollector, hideRefreshButton, getColumns, appId, onBackgroundSearchOpened, trackingProps, ...props }: Props): React.JSX.Element;
export {};
