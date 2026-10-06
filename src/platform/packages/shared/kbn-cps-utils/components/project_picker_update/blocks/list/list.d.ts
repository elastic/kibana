import type { RefObject } from 'react';
import React from 'react';
export interface ProjectPickerListProps {
    /**
     * Ref to the scrollable ancestor that clips the list, if any. When the list is scrolled
     * within this container, any open popover is closed rather than left floating disconnected
     * from its anchor button.
     */
    scrollContainerRef?: RefObject<HTMLElement>;
    showProjectTags?: boolean;
}
export declare function ProjectPickerList({ scrollContainerRef, showProjectTags, }: ProjectPickerListProps): React.JSX.Element;
