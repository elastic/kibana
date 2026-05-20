import type { PaletteRegistry } from '@kbn/coloring';
import type { ExpressionsSetup } from '@kbn/expressions-plugin/public';
import type { CoreTheme } from '@kbn/core/public';
import type { ChartsPluginSetup } from '../..';
export interface PaletteSetupPlugins {
    expressions: ExpressionsSetup;
    charts: ChartsPluginSetup;
}
export declare class PaletteService {
    private palettes;
    constructor();
    setup(theme: CoreTheme): {
        getPalettes: () => Promise<PaletteRegistry>;
    };
}
