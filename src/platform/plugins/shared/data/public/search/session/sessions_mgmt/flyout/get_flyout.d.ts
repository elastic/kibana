import type { CoreStart } from '@kbn/core/public';
import type { SharePluginStart } from '@kbn/share-plugin/public';
import type { ISessionsClient } from '../../../..';
import type { SearchUsageCollector } from '../../../collectors';
import type { SearchSessionsConfigSchema } from '../../../../../server/config';
import type { BackgroundSearchOpenedHandler } from '../types';
import type { ISearchSessionEBTManager } from '../../ebt_manager';
export declare function openSearchSessionsFlyout({ coreStart, kibanaVersion, usageCollector, ebtManager, config, sessionsClient, share, }: {
    coreStart: CoreStart;
    kibanaVersion: string;
    usageCollector: SearchUsageCollector;
    ebtManager: ISearchSessionEBTManager;
    config: SearchSessionsConfigSchema;
    sessionsClient: ISessionsClient;
    share: SharePluginStart;
}): (attrs: {
    appId: string;
    trackingProps: {
        openedFrom: string;
    };
    onBackgroundSearchOpened?: BackgroundSearchOpenedHandler;
    onClose?: () => void;
}) => {
    flyout: import("@kbn/core/public").OverlayRef;
};
