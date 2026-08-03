import type { ReactNode } from 'react';
import React from 'react';
import type { ResizableLayoutDirection, ResizableLayoutOrder } from '../types';
import { ResizableLayoutMode } from '../types';
export interface ResizableLayoutProps {
    /**
     * Class name for the layout container
     */
    className?: string;
    /**
     * The current layout mode
     */
    mode: ResizableLayoutMode;
    /**
     * The current layout direction
     */
    direction: ResizableLayoutDirection;
    /**
     * Current size of the fixed panel in pixels
     */
    fixedPanelSize: number | 'max-content';
    /**
     * Minimum size of the fixed panel in pixels
     */
    minFixedPanelSize: number;
    /**
     * Minimum size of the flex panel in pixels
     */
    minFlexPanelSize: number;
    /**
     * The fixed panel
     */
    fixedPanel: ReactNode;
    /**
     * The flex panel
     */
    flexPanel: ReactNode;
    /**
     * The side to render the fixed panel.
     */
    fixedPanelOrder?: ResizableLayoutOrder;
    /**
     * Class name for the resize button
     */
    resizeButtonClassName?: string;
    /**
     * Test subject for the layout container
     */
    ['data-test-subj']?: string;
    /**
     * Callback when the fixed panel size changes, receives the new size in pixels
     */
    onFixedPanelSizeChange?: (fixedPanelSize: number) => void;
}
export declare const ResizableLayout: ({ className, mode, direction, fixedPanelSize, minFixedPanelSize, minFlexPanelSize, fixedPanel, flexPanel, fixedPanelOrder, resizeButtonClassName, ["data-test-subj"]: dataTestSubj, onFixedPanelSizeChange, }: ResizableLayoutProps) => React.JSX.Element;
