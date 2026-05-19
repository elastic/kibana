import type { CoreStart, CoreSetup, Plugin, PluginInitializerContext } from '@kbn/core/server';
import type { ExpressionsServiceSetup, ExpressionsServiceStart } from '../common';
import { ExpressionsService } from '../common';
export type ExpressionsServerSetup = ExpressionsServiceSetup;
export type ExpressionsServerStart = ExpressionsServiceStart;
export declare class ExpressionsServerPlugin implements Plugin<ExpressionsServerSetup, ExpressionsServerStart> {
    readonly expressions: ExpressionsService;
    constructor(context: PluginInitializerContext);
    setup(core: CoreSetup): ExpressionsServerSetup;
    start(core: CoreStart): ExpressionsServerStart;
    stop(): void;
}
