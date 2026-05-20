import type { ReactNode } from 'react';
import React from 'react';
import { ResizableLayoutDirection } from '../types';
export declare const PanelsStatic: ({ className, direction, hideFixedPanel, fixedPanel, flexPanel, }: {
    className?: string;
    direction: ResizableLayoutDirection;
    hideFixedPanel?: boolean;
    fixedPanel: ReactNode;
    flexPanel: ReactNode;
}) => React.JSX.Element;
