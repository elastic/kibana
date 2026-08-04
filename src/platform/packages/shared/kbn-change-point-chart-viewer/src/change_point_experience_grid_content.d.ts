import React from 'react';
import type { UnifiedChangePointGridProps } from './types';
import type { ChangePointCardModel } from './utils/derive_change_point_cards';
interface ChangePointExperienceGridContentProps extends UnifiedChangePointGridProps {
    displayedCards: ChangePointCardModel[];
    currentPage: number;
    onPageChange: (page: number) => void;
    seriesColumns: {
        valueColumn: string;
        timeColumn: string;
    } | undefined;
}
export declare const ChangePointExperienceGridContent: React.FC<ChangePointExperienceGridContentProps>;
export {};
