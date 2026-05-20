import type { Plugin, CoreSetup } from '@kbn/core/public';
import type { ExpressionsSetup } from '@kbn/expressions-plugin/public';
import type { ThemeService } from './services';
import type { PaletteService } from './services/palettes/service';
import type { ActiveCursor } from './services/active_cursor';
interface SetupDependencies {
    expressions: ExpressionsSetup;
}
/** @public */
export interface ChartsPluginSetup {
    theme: Omit<ThemeService, 'init'>;
    palettes: ReturnType<PaletteService['setup']>;
}
/** @public */
export type ChartsPluginStart = ChartsPluginSetup & {
    activeCursor: ActiveCursor;
};
/** @public */
export declare class ChartsPlugin implements Plugin<ChartsPluginSetup, ChartsPluginStart> {
    private readonly themeService;
    private readonly paletteService;
    private readonly activeCursor;
    private palettes;
    setup(core: CoreSetup, dependencies: SetupDependencies): ChartsPluginSetup;
    start(): ChartsPluginStart;
}
export {};
