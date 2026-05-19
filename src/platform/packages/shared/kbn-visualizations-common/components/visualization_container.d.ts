import type { ReactNode } from 'react';
import React from 'react';
import type { IInterpreterRenderHandlers } from '@kbn/expressions-plugin/common';
export interface VisualizationContainerProps {
    'data-test-subj'?: string;
    className?: string;
    children: ReactNode;
    handlers: IInterpreterRenderHandlers;
    renderComplete?: () => void;
    showNoResult?: boolean;
    error?: string;
}
export declare const VisualizationContainer: ({ "data-test-subj": dataTestSubj, className, children, handlers, showNoResult, error, renderComplete, }: VisualizationContainerProps) => React.JSX.Element;
