import React from 'react';
import { type IconButtonGroupProps } from '@kbn/shared-ux-button-toolbar';
/**
 * Toggle button props
 */
export interface SidebarToggleButtonProps {
    'data-test-subj'?: string;
    isSidebarCollapsed: boolean;
    panelId?: string;
    buttonSize: IconButtonGroupProps['buttonSize'];
    onChange: (isSidebarCollapsed: boolean) => void;
}
/**
 * A toggle button for the fields sidebar
 * @param data-test-subj
 * @param isSidebarCollapsed
 * @param panelId
 * @param onChange
 * @constructor
 */
export declare const SidebarToggleButton: React.FC<SidebarToggleButtonProps>;
