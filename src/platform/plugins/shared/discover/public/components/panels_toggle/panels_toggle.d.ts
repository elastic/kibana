import React from 'react';
export interface PanelsToggleProps {
    omitChartButton?: boolean;
    omitTableButton?: boolean;
    dataTestSubjSuffix?: string;
}
/**
 * @param omitChartButton
 * @param omitTableButton
 * @param dataTestSubjSuffix
 * @constructor
 */
export declare const PanelsToggle: React.FC<PanelsToggleProps>;
