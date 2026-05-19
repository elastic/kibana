import type { FC, PropsWithChildren } from 'react';
import type { InternalApplicationStart } from '@kbn/core-application-browser-internal';
import type { DocLinksStart } from '@kbn/core-doc-links-browser';
import type { HttpStart } from '@kbn/core-http-browser';
import type { CustomBrandingStart } from '@kbn/core-custom-branding-browser';
export interface ChromeComponentsDeps {
    application: Pick<InternalApplicationStart, 'navigateToUrl' | 'currentAppId$' | 'currentActionMenu$'>;
    http: Pick<HttpStart, 'basePath' | 'getLoadingCount$'>;
    docLinks: DocLinksStart;
    customBranding: Pick<CustomBrandingStart, 'customBranding$'>;
}
/**
 * Provides `ChromeComponentsDeps` to all context-aware Chrome components (`Header`,
 * `ProjectHeader`, `GridLayoutProjectSideNav`, `HeaderTopBanner`, `ChromelessHeader`,
 * `AppMenuBar`, `Sidebar`).
 *
 * The layout layer passes whole service contracts (narrowed via `Pick`) and wraps the
 * layout tree once. Chrome-owned state is accessed separately via `useChromeService()` hooks.
 */
export declare const ChromeComponentsProvider: FC<PropsWithChildren<{
    value: ChromeComponentsDeps;
}>>;
/**
 * Reads `ChromeComponentsDeps` from the nearest `ChromeComponentsProvider`.
 * Throws if called outside the provider.
 */
export declare const useChromeComponentsDeps: () => ChromeComponentsDeps;
