import type { DocViewRenderProps } from '@kbn/unified-doc-viewer/types';
import type { BaseFlyoutData } from '../use_document_flyout_data';
export interface UseLogFlyoutDataParams {
    id: string;
    index?: string;
}
export interface LogFlyoutData extends BaseFlyoutData {
    logDataView: DocViewRenderProps['dataView'] | null;
}
export declare function useLogFlyoutData({ id, index }: UseLogFlyoutDataParams): LogFlyoutData;
