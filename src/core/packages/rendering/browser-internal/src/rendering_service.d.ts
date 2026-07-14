import React from 'react';
import type { AnalyticsServiceStart } from '@kbn/core-analytics-browser';
import type { InternalApplicationStart } from '@kbn/core-application-browser-internal';
import type { InternalChromeStart } from '@kbn/core-chrome-browser-internal';
import type { ExecutionContextStart } from '@kbn/core-execution-context-browser';
import type { I18nStart } from '@kbn/core-i18n-browser';
import type { OverlayStart } from '@kbn/core-overlays-browser';
import type { ThemeServiceStart } from '@kbn/core-theme-browser';
import type { UserProfileService } from '@kbn/core-user-profile-browser';
import type { FeatureFlagsStart } from '@kbn/core-feature-flags-browser';
import type { InternalHttpStart } from '@kbn/core-http-browser-internal';
import type { DocLinksStart } from '@kbn/core-doc-links-browser';
import type { CustomBrandingStart } from '@kbn/core-custom-branding-browser';
import type { RenderingService as IRenderingService } from '@kbn/core-rendering-browser';
import type { CoreEnv } from '@kbn/core-base-browser-internal';
export interface RenderingServiceContextDeps {
    analytics: AnalyticsServiceStart;
    executionContext: ExecutionContextStart;
    i18n: I18nStart;
    theme: ThemeServiceStart;
    userProfile: UserProfileService;
    chrome: InternalChromeStart;
    coreEnv: CoreEnv;
}
export interface RenderingServiceRenderCoreDeps {
    application: InternalApplicationStart;
    chrome: InternalChromeStart;
    overlays: OverlayStart;
    featureFlags: FeatureFlagsStart;
    http: InternalHttpStart;
    docLinks: DocLinksStart;
    customBranding: CustomBrandingStart;
}
export interface RenderingServiceInternalStart extends IRenderingService {
    renderCore: (renderCoreDeps: RenderingServiceRenderCoreDeps, targetDomElement: HTMLDivElement) => void;
}
/**
 * Renders all Core UI in a single React tree.
 *
 * @internalRemarks Currently this only renders Chrome UI. Notifications and
 * Overlays UI should be moved here as well (https://github.com/elastic/kibana/issues/247820).
 *
 * @internal
 */
export declare class RenderingService implements IRenderingService {
    private contextDeps;
    /**
     * @internal
     */
    start(deps: RenderingServiceContextDeps): RenderingServiceInternalStart;
    /**
     * @internal
     */
    renderCore(renderCoreDeps: RenderingServiceRenderCoreDeps, targetDomElement: HTMLDivElement): void;
    private readonly ContextWrapper;
    /**
     * @public
     */
    addContext(element: React.ReactNode): React.ReactElement<string>;
}
