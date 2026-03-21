import type { CoreSetup, CoreStart, PluginInitializerContext, Plugin } from '@kbn/core/public';
import type { SavedObjectTaggingOssPluginSetup, SavedObjectTaggingOssPluginStart } from './types';
import type { SavedObjectsTaggingApi } from './api';
export declare class SavedObjectTaggingOssPlugin implements Plugin<SavedObjectTaggingOssPluginSetup, SavedObjectTaggingOssPluginStart, {}> {
    private apiRegistered;
    private api?;
    constructor(context: PluginInitializerContext);
    setup({}: CoreSetup): {
        registerTaggingApi: (provider: Promise<SavedObjectsTaggingApi>) => void;
    };
    start({}: CoreStart): {
        isTaggingAvailable: () => boolean;
        getTaggingApi: () => SavedObjectsTaggingApi | undefined;
    };
}
