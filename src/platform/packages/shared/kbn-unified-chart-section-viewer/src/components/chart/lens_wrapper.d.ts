import React from 'react';
import type { QuickActionIds } from '@kbn/embeddable-plugin/public';
import type { LensProps } from './hooks/use_lens_props';
import type { UnifiedMetricsGridProps } from '../../types';
export type LensWrapperProps = {
    lensProps: LensProps;
    titleHighlight?: string;
    onViewDetails?: () => void;
    onCopyToDashboard?: () => void;
    onExploreInDiscoverTab?: UnifiedMetricsGridProps['actions']['openInNewTab'];
    syncTooltips?: boolean;
    syncCursor?: boolean;
    abortController: AbortController | undefined;
    disabledActions?: string[];
    extraDisabledActions?: string[];
    quickActionIds?: QuickActionIds;
} & Pick<UnifiedMetricsGridProps, 'services' | 'onBrushEnd' | 'onFilter'>;
export declare function LensWrapper({ lensProps, services, onBrushEnd, onFilter, abortController, titleHighlight, onViewDetails, onCopyToDashboard, onExploreInDiscoverTab, syncTooltips, syncCursor, extraDisabledActions, quickActionIds, }: LensWrapperProps): React.JSX.Element;
