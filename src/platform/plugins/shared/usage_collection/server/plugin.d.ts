import type { PluginInitializerContext, CoreSetup, CoreStart, Plugin } from '@kbn/core/server';
import type { ICollectorSet } from './collector/types';
import type { UsageCountersServiceSetup, UsageCountersServiceStart } from './usage_counters/types';
/** Plugin's setup API **/
export type UsageCollectionSetup = ICollectorSet & UsageCountersServiceSetup;
/** Plugin's start API **/
export type UsageCollectionStart = UsageCountersServiceStart;
export declare class UsageCollectionPlugin implements Plugin<UsageCollectionSetup, UsageCollectionStart> {
    private readonly initializerContext;
    private readonly logger;
    private savedObjects?;
    private usageCountersService?;
    constructor(initializerContext: PluginInitializerContext);
    setup(core: CoreSetup): UsageCollectionSetup;
    start({ savedObjects }: CoreStart): UsageCollectionStart;
    stop(): void;
}
