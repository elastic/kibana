import type { UnifiedHistogramPartialLayoutProps } from '@kbn/unified-histogram';
import { type ReactElement } from 'react';
export declare const useUnifiedHistogramCommon: ({ currentTabId, layoutProps, panelsToggle, localStorageKeyPrefix, }: {
    currentTabId: string;
    layoutProps?: UnifiedHistogramPartialLayoutProps;
    panelsToggle?: ReactElement;
    localStorageKeyPrefix?: string;
}) => {
    renderToggleActions: () => ReactElement<any, string | import("react").JSXElementConstructor<any>> | undefined;
};
