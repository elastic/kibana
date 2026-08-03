import type { PaletteRegistry } from '@kbn/coloring';
import type { CoreTheme } from '@kbn/core/public';
import type { Observable } from 'rxjs';
export interface PaletteServiceSetup {
    /**
     * Lazily loads the palette definitions and resolves to a registry reflecting the
     * current theme. The returned registry is "live": its `get`/`getAll` methods always
     * read the palettes built for the latest theme, so consumers that re-render on theme
     * changes pick up the new colors automatically without re-fetching.
     */
    getPalettes: () => Promise<PaletteRegistry>;
    /**
     * An observable of the palette registry that emits a new registry whenever the
     * theme values relevant to palettes (dark mode / theme name) change.
     */
    getPalettes$: () => Observable<PaletteRegistry>;
}
export declare class PaletteService {
    private theme$?;
    private palettes$?;
    private currentPalettes?;
    setup(theme$: Observable<CoreTheme>): PaletteServiceSetup;
    private getPalettes$;
    private createRegistry;
}
