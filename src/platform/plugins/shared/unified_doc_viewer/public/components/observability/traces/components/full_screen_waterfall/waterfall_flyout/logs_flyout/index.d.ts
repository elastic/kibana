import type { DataTableRecord } from '@kbn/discover-utils';
import type { DocViewRenderProps } from '@kbn/unified-doc-viewer/types';
import React from 'react';
export { useLogFlyoutData } from './use_log_flyout_data';
export type { UseLogFlyoutDataParams, LogFlyoutData } from './use_log_flyout_data';
export interface LogFlyoutContentProps {
    hit: DataTableRecord;
    logDataView: DocViewRenderProps['dataView'];
}
export declare function LogFlyoutContent({ hit, logDataView }: LogFlyoutContentProps): React.JSX.Element;
