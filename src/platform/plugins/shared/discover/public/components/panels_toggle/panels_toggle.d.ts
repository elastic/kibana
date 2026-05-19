import React from 'react';
import type { BehaviorSubject } from 'rxjs';
import type { SidebarToggleState } from '../../application/types';
export interface PanelsToggleProps {
    sidebarToggleState$: BehaviorSubject<SidebarToggleState>;
    omitChartButton?: boolean;
    omitTableButton?: boolean;
    dataTestSubjSuffix?: string;
}
/**
 * @param sidebarToggleState$
 * @param omitChartButton
 * @param omitTableButton
 * @param dataTestSubjSuffix
 * @constructor
 */
export declare const PanelsToggle: React.FC<PanelsToggleProps>;
