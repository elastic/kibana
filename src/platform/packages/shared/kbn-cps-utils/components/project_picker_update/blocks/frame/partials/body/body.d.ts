import type { PropsWithChildren, RefObject } from 'react';
import React from 'react';
export interface ProjectPickerFrameBodyProps {
    children: React.ReactNode;
    maxHeight?: number;
    scrollContainerRef?: RefObject<HTMLDivElement>;
}
export declare function ProjectPickerFrameBodyHeader(): React.JSX.Element;
export declare function ProjectPickerFrameBody({ children, maxHeight, scrollContainerRef, }: PropsWithChildren<ProjectPickerFrameBodyProps>): React.JSX.Element;
