import React from 'react';
import type { ChangePointCardModel } from '../utils/derive_change_point_cards';
import type { UnifiedChangePointGridProps } from '../types';
export interface ChangePointLensChartProps extends Pick<UnifiedChangePointGridProps, 'services' | 'fetchParams' | 'fetch$' | 'onBrushEnd' | 'onFilter' | 'actions'> {
    card: ChangePointCardModel;
    cardIndex: number;
    valueColumn: string;
    timeColumn: string;
}
export declare const ChangePointLensChart: React.FC<ChangePointLensChartProps>;
