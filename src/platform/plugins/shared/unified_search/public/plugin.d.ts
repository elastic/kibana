import type { CoreSetup, CoreStart, Plugin } from '@kbn/core/public';
import type { UnifiedSearchStartDependencies, UnifiedSearchSetupDependencies, UnifiedSearchPluginSetup, UnifiedSearchPublicPluginStart } from './types';
export declare class UnifiedSearchPublicPlugin implements Plugin<UnifiedSearchPluginSetup, UnifiedSearchPublicPluginStart> {
    private readonly storage;
    private usageCollection;
    constructor();
    setup(core: CoreSetup<UnifiedSearchStartDependencies, UnifiedSearchPublicPluginStart>, { uiActions, data, usageCollection }: UnifiedSearchSetupDependencies): UnifiedSearchPluginSetup;
    start(core: CoreStart, { data, dataViews, uiActions, screenshotMode, cps: crossProjectSearch, kql: { autocomplete: autocompleteStart }, }: UnifiedSearchStartDependencies): UnifiedSearchPublicPluginStart;
}
