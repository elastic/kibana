import type { ReactNode } from 'react';
import React from 'react';
import { ResizableLayoutOrder, type ResizableLayoutDirection } from '../types';
export declare const PanelsResizable: ({ className, direction, fixedPanelSize, minFixedPanelSize, minFlexPanelSize, fixedPanel, flexPanel, fixedPanelOrder, resizeButtonClassName, ["data-test-subj"]: dataTestSubj, onFixedPanelSizeChange, }: {
    className?: string;
    direction: ResizableLayoutDirection;
    fixedPanelSize: number | "max-content";
    minFixedPanelSize: number;
    minFlexPanelSize: number;
    fixedPanel: ReactNode;
    flexPanel: ReactNode;
    fixedPanelOrder?: ResizableLayoutOrder;
    resizeButtonClassName?: string;
    ["data-test-subj"]?: string;
    onFixedPanelSizeChange?: (fixedPanelSize: number) => void;
}) => React.JSX.Element;
