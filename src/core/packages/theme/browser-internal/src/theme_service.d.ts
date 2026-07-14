import type { InternalInjectedMetadataSetup } from '@kbn/core-injected-metadata-browser-internal';
import type { InternalThemeServiceStart } from '@kbn/core-theme-browser-internal-types';
/** @internal */
export interface ThemeServiceSetupDeps {
    injectedMetadata: InternalInjectedMetadataSetup;
}
/** @internal */
export declare class ThemeService {
    private contract?;
    private themeMetadata?;
    private stylesheets;
    private theme$?;
    setup({ injectedMetadata }: ThemeServiceSetupDeps): InternalThemeServiceStart;
    start(): InternalThemeServiceStart;
    stop(): void;
    private applyTheme;
}
