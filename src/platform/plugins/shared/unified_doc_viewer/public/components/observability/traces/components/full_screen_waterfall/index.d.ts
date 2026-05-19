import { type EuiFlyoutProps } from '@elastic/eui';
import type { FullTraceWaterfallOnErrorClick } from '@kbn/apm-types';
import type { DocViewRenderProps } from '@kbn/unified-doc-viewer/types';
import React from 'react';
import type { TraceOverviewSections } from '../../doc_viewer_overview/overview';
import type { TraceDocFlyoutType } from '../../common/types';
export interface FullScreenWaterfallProps {
    traceId: string;
    rangeFrom: string;
    rangeTo: string;
    dataView: DocViewRenderProps['dataView'];
    serviceName?: string;
    contextSpanIds?: string[];
    scrollToContextOnMount?: boolean;
    docId: string | null;
    docIndex?: string;
    activeFlyoutType: TraceDocFlyoutType | null;
    activeSection?: TraceOverviewSections;
    skipOpenAnimation?: boolean;
    onNodeClick: (nodeSpanId: string) => void;
    onErrorClick: FullTraceWaterfallOnErrorClick;
    onCloseFlyout: EuiFlyoutProps['onClose'];
    onExitFullScreen: EuiFlyoutProps['onClose'];
    skipNextEventReport?: boolean;
}
export declare const FullScreenWaterfall: ({ traceId, rangeFrom, rangeTo, dataView, serviceName, contextSpanIds, scrollToContextOnMount, docId, docIndex, activeFlyoutType, activeSection, skipOpenAnimation, onNodeClick, onErrorClick, onCloseFlyout, onExitFullScreen, skipNextEventReport, }: FullScreenWaterfallProps) => React.JSX.Element | null;
