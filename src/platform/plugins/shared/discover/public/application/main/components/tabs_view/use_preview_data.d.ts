import type { TabItem, TabPreviewData } from '@kbn/unified-tabs';
import type { RuntimeStateManager } from '../../state_management/redux';
export declare const usePreviewData: (runtimeStateManager: RuntimeStateManager) => {
    getPreviewData: (item: TabItem) => TabPreviewData;
};
