import React from 'react';
import type { UnifiedChangePointGridProps } from './types';
export interface ChangePointChartForRowProps extends Pick<UnifiedChangePointGridProps, 'services' | 'fetchParams' | 'fetch$' | 'onBrushEnd' | 'onFilter' | 'actions'> {
    row: Readonly<Record<string, unknown>>;
}
/**
 * Renders the change point mini chart and details for a single result row.
 * Shows an informational message when the row has no detected change point.
 */
export declare const ChangePointChartForRow: React.FC<ChangePointChartForRowProps>;
