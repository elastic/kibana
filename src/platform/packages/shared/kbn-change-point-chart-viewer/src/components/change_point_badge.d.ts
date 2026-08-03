import React from 'react';
import type { ChangePointCardModel } from '../utils/derive_change_point_cards';
export interface ChangePointBadgeProps {
    changePointTypes: ChangePointCardModel['changePointTypes'];
    minPvalue: ChangePointCardModel['minPvalue'];
}
/**
 * Badge showing the change-point type(s) for a chart card, colour-coded by the card's minimum
 * pvalue to match the significance colours in the Discover results table.
 *
 * Renders nothing when no type data is available (BY mode) or when minPvalue is undefined.
 * Positioning is handled by the parent — this component renders only the EuiBadge itself.
 */
export declare const ChangePointBadge: React.FC<ChangePointBadgeProps>;
