import type { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from '@kbn/core/server';
import type { CPSServerSetup, CPSServerStart } from './types';
export declare class CPSServerPlugin implements Plugin<CPSServerSetup, CPSServerStart | undefined> {
    private readonly initContext;
    private readonly isServerless;
    private readonly config$;
    private readonly log;
    constructor(initContext: PluginInitializerContext);
    setup(core: CoreSetup): {
        getCpsEnabled: () => boolean;
    };
    start(core: CoreStart): CPSServerStart | undefined;
    stop(): void;
}
