import type React from 'react';
import type { InternalApplicationStart } from '@kbn/core-application-browser-internal';
import type { OverlayStart } from '@kbn/core-overlays-browser';
import type { InternalHttpStart } from '@kbn/core-http-browser-internal';
import type { DocLinksStart } from '@kbn/core-doc-links-browser';
import type { CustomBrandingStart } from '@kbn/core-custom-branding-browser';
import type { FeatureFlagsStart } from '@kbn/core-feature-flags-browser';
export interface LayoutServiceStartDeps {
    application: InternalApplicationStart;
    overlays: OverlayStart;
    http: InternalHttpStart;
    docLinks: DocLinksStart;
    customBranding: CustomBrandingStart;
    featureFlags: FeatureFlagsStart;
}
/**
 * The LayoutService responsible for layout management of Kibana.
 * Kibana can swap between different layout service implementation to support different layout types.
 *
 * @internal
 */
export interface LayoutService {
    /**
     * Returns a layout component with the provided dependencies
     */
    getComponent: () => React.ComponentType;
}
