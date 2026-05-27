import React from 'react';
import type { CoreStart } from '@kbn/core/public';
import type { SearchSessionsConfigSchema } from '../../../../../server/config';
import type { SearchSessionsMgmtAPI } from '../lib/api';
import type { SearchUsageCollector } from '../../../collectors';
import type { BackgroundSearchOpenedHandler, LocatorsStart } from '../types';
import type { ISearchSessionEBTManager } from '../../ebt_manager';
export declare const Flyout: ({ api, coreStart, usageCollector, ebtManager, config, kibanaVersion, locators, appId, trackingProps, onBackgroundSearchOpened, onClose, }: {
    api: SearchSessionsMgmtAPI;
    coreStart: CoreStart;
    usageCollector: SearchUsageCollector;
    ebtManager: ISearchSessionEBTManager;
    config: SearchSessionsConfigSchema;
    kibanaVersion: string;
    locators: LocatorsStart;
    appId?: string;
    trackingProps: {
        openedFrom: string;
    };
    onBackgroundSearchOpened?: BackgroundSearchOpenedHandler;
    onClose: () => void;
}) => React.JSX.Element;
