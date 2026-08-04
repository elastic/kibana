import type { CoreStart } from '@kbn/core-lifecycle-browser';
import type { CloudStart } from '@kbn/cloud-plugin/public';
import type { SharePluginStart } from '@kbn/share-plugin/public';
export interface ConnectionDetailsGlobalDependencies {
    start: {
        core: {
            analytics: CoreStart['analytics'];
            i18n: CoreStart['i18n'];
            docLinks: CoreStart['docLinks'];
            theme: CoreStart['theme'];
            http: CoreStart['http'];
            application: CoreStart['application'];
            overlays: CoreStart['overlays'];
            userProfile: CoreStart['userProfile'];
        };
        plugins: {
            cloud?: CloudStart;
            share?: SharePluginStart;
        };
    };
}
export declare const setGlobalDependencies: (dependencies: ConnectionDetailsGlobalDependencies) => void;
export declare const getGlobalDependencies: () => ConnectionDetailsGlobalDependencies;
