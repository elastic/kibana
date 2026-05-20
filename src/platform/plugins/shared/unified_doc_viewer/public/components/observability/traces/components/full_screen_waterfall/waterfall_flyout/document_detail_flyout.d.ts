import { type EuiFlyoutProps } from '@elastic/eui';
import type { DocViewRenderProps } from '@kbn/unified-doc-viewer/types';
import React from 'react';
import type { TraceOverviewSections } from '../../../doc_viewer_overview/overview';
import type { TraceDocFlyoutType } from '../../../common/types';
export interface DocumentDetailFlyoutProps {
    type: TraceDocFlyoutType;
    docId: string;
    docIndex?: string;
    traceId: string;
    dataView: DocViewRenderProps['dataView'];
    dataTestSubj?: string;
    hasAnimation?: boolean;
    onCloseFlyout: EuiFlyoutProps['onClose'];
    activeSection?: TraceOverviewSections;
    skipNextEventReport?: boolean;
    size?: EuiFlyoutProps['size'];
}
export declare function DocumentDetailFlyout({ type, docId, docIndex, traceId, dataView, dataTestSubj, hasAnimation, onCloseFlyout, activeSection, skipNextEventReport, size, }: DocumentDetailFlyoutProps): React.JSX.Element;
