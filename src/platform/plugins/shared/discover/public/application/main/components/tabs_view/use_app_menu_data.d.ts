import type { EuiResizeObserverProps } from '@elastic/eui';
import type { UnifiedTabsProps } from '@kbn/unified-tabs';
import type { AppMenuConfig } from '@kbn/core-chrome-app-menu-components';
import type { DataView } from '@kbn/data-views-plugin/common';
interface UseAppMenuDataParams {
    currentDataView: DataView | undefined;
}
interface UseAppMenuDataResult {
    shouldCollapseAppMenu: boolean;
    onResize: EuiResizeObserverProps['onResize'];
    getTopTabMenuItems: UnifiedTabsProps['getTopTabMenuItems'];
    getAdditionalTabMenuItems: UnifiedTabsProps['getAdditionalTabMenuItems'];
    topNavMenuItems: AppMenuConfig | undefined;
}
export declare const useAppMenuData: ({ currentDataView }: UseAppMenuDataParams) => UseAppMenuDataResult;
export {};
