import type { ObservabilityIndexes } from '@kbn/discover-utils/src';
import React from 'react';
import { type DocumentDetailFlyoutProps } from './document_detail_flyout';
export type { TraceDocFlyoutType } from '../../../common/types';
export interface TraceDocFlyoutProps extends DocumentDetailFlyoutProps {
    indexes: ObservabilityIndexes;
}
export declare function TraceDocFlyout({ indexes, ...rest }: TraceDocFlyoutProps): React.JSX.Element;
