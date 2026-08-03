import React from 'react';
import type { CoreStart, HttpStart } from '@kbn/core/public';
import type { SharePluginStart } from '@kbn/share-plugin/public';
import type { SearchSessionsMgmtAPI } from '../lib/api';
import type { SearchSessionsConfigSchema } from '../../../../../server/config';
import type { SearchUsageCollector } from '../../../collectors';
import type { ISearchSessionEBTManager } from '../../ebt_manager';
interface Props {
    core: CoreStart;
    api: SearchSessionsMgmtAPI;
    http: HttpStart;
    timezone: string;
    config: SearchSessionsConfigSchema;
    kibanaVersion: string;
    share: SharePluginStart;
    searchUsageCollector: SearchUsageCollector;
    searchSessionEBTManager: ISearchSessionEBTManager;
}
export declare function SearchSessionsMgmtMain({ share, ...tableProps }: Props): React.JSX.Element;
export {};
