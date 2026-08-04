import * as React from 'react';
import type { CoreStart } from '@kbn/core-lifecycle-browser';
import type { CloudStart } from '@kbn/cloud-plugin/public';
import type { SharePluginStart } from '@kbn/share-plugin/public';
import type { ConnectionDetailsOpts } from '../types';
export interface KibanaConnectionDetailsProviderProps {
    onNavigation?: () => void;
    options?: ConnectionDetailsOpts;
    start: {
        core: {
            i18n: CoreStart['i18n'];
            docLinks: CoreStart['docLinks'];
            theme: CoreStart['theme'];
            http?: CoreStart['http'];
            application?: CoreStart['application'];
            analytics?: CoreStart['analytics'];
        };
        plugins?: {
            cloud?: CloudStart;
            share?: SharePluginStart;
        };
    };
}
export declare const KibanaConnectionDetailsProvider: React.FC<React.PropsWithChildren<KibanaConnectionDetailsProviderProps>>;
