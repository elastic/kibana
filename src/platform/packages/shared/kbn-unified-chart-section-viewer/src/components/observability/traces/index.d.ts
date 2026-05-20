import React from 'react';
import type { UnifiedMetricsGridProps } from '../../../types';
export declare const chartPalette: import("@elastic/eui/src/services/color/eui_palettes").EuiPalette;
declare function TraceMetricsGrid({ fetchParams, fetch$: discoverFetch$, services, onBrushEnd, onFilter, actions, profileId, renderToggleActions, chartToolbarCss, isComponentVisible, }: UnifiedMetricsGridProps): React.JSX.Element | undefined;
export default TraceMetricsGrid;
