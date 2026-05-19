import { type EuiFlyoutProps } from '@elastic/eui';
import type { DataTableRecord } from '@kbn/discover-utils';
import type { DocViewRenderProps } from '@kbn/unified-doc-viewer/types';
import React from 'react';
import type { FlyoutContentId } from '../../../common/constants';
export interface Props {
    title: string;
    onCloseFlyout: EuiFlyoutProps['onClose'];
    hit: DataTableRecord | null;
    loading: boolean;
    dataView: DocViewRenderProps['dataView'];
    dataTestSubj?: string;
    hasAnimation?: boolean;
    flyoutContentId: FlyoutContentId;
    children: React.ReactNode;
    skipNextEventReport?: boolean;
    size?: EuiFlyoutProps['size'];
}
export declare function WaterfallFlyout({ onCloseFlyout, dataView, hit, loading, children, title, dataTestSubj, hasAnimation, flyoutContentId, skipNextEventReport, size, }: Props): React.JSX.Element;
