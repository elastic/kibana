import type * as React from 'react';
import type { CoreStart } from '@kbn/core/public';
export interface KibanaReactOverlays {
    openFlyout: (node: React.ReactNode, options?: Parameters<CoreStart['overlays']['openFlyout']>['1']) => ReturnType<CoreStart['overlays']['openFlyout']>;
    openModal: (node: React.ReactNode, options?: Parameters<CoreStart['overlays']['openModal']>['1']) => ReturnType<CoreStart['overlays']['openModal']>;
}
