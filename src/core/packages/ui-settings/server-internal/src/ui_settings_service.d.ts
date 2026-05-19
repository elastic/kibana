import type { CoreContext, CoreService } from '@kbn/core-base-server-internal';
import type { InternalHttpServiceSetup } from '@kbn/core-http-server-internal';
import type { InternalSavedObjectsServiceSetup } from '@kbn/core-saved-objects-server-internal';
import type { InternalUiSettingsServicePreboot, InternalUiSettingsServiceSetup, InternalUiSettingsServiceStart } from './types';
export interface SetupDeps {
    http: InternalHttpServiceSetup;
    savedObjects: InternalSavedObjectsServiceSetup;
}
/** @internal */
export declare class UiSettingsService implements CoreService<InternalUiSettingsServiceSetup, InternalUiSettingsServiceStart> {
    private readonly coreContext;
    private readonly log;
    private readonly config$;
    private readonly isDist;
    private readonly isDev;
    private readonly uiSettingsDefaults;
    private readonly uiSettingsGlobalDefaults;
    private overrides;
    private globalOverrides;
    private allowlist;
    private readonly sharedUserProvidedCache;
    constructor(coreContext: CoreContext);
    preboot(): Promise<InternalUiSettingsServicePreboot>;
    setup({ http, savedObjects }: SetupDeps): Promise<InternalUiSettingsServiceSetup>;
    start(): Promise<InternalUiSettingsServiceStart>;
    stop(): Promise<void>;
    private getScopedClientFactory;
    private register;
    private registerGlobal;
    private setAllowlist;
    private validateAllowlist;
    private setReadonlyMode;
    private applyAllowlist;
    private validatesDefinitions;
    private validatesOverrides;
}
