import type { CoreContext } from '@kbn/core-base-server-internal';
import type { RenderingPrebootDeps, RenderingSetupDeps, InternalRenderingServicePreboot, InternalRenderingServiceSetup, RenderingStartDeps } from './types';
export declare const DEFAULT_THEME_NAME_FEATURE_FLAG = "coreRendering.defaultThemeName";
/** @internal */
export declare class RenderingService {
    private readonly coreContext;
    private readonly themeName$;
    private airgapped;
    private isCoreRenderingInReactConcurrentMode;
    constructor(coreContext: CoreContext);
    preboot({ http, uiPlugins, i18n, }: RenderingPrebootDeps): Promise<InternalRenderingServicePreboot>;
    setup({ elasticsearch, featureFlags, http, status, uiPlugins, customBranding, userSettings, i18n, }: RenderingSetupDeps): Promise<InternalRenderingServiceSetup>;
    start({ featureFlags }: RenderingStartDeps): void;
    private render;
    stop(): Promise<void>;
}
