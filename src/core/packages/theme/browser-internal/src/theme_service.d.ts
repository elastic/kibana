import type { InternalInjectedMetadataSetup } from '@kbn/core-injected-metadata-browser-internal';
import type { ThemeServiceSetup, ThemeServiceStart } from '@kbn/core-theme-browser';
/** @internal */
export interface ThemeServiceSetupDeps {
    injectedMetadata: InternalInjectedMetadataSetup;
}
/** @internal */
export declare class ThemeService {
    private contract?;
    private themeMetadata?;
    private stylesheets;
    setup({ injectedMetadata }: ThemeServiceSetupDeps): ThemeServiceSetup;
    start(): ThemeServiceStart;
    stop(): void;
    private applyTheme;
}
