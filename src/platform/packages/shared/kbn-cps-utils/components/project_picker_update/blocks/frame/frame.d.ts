import React, { type PropsWithChildren, type RefObject, type ComponentProps } from 'react';
import { type HeaderContextMenuItemProps, ProjectPickerFrameBody } from './partials';
interface ProjectPickerFrameProps {
    scrollContainerRef?: RefObject<HTMLDivElement>;
    customHeaderContextMenuItems?: HeaderContextMenuItemProps[];
    customHeaderText?: React.ReactNode;
    maxBodyHeight?: ComponentProps<typeof ProjectPickerFrameBody>['maxHeight'];
    showHeader?: boolean;
}
export declare function ProjectPickerFrame({ children, maxBodyHeight, customHeaderContextMenuItems, customHeaderText, scrollContainerRef, showHeader, }: PropsWithChildren<ProjectPickerFrameProps>): React.JSX.Element;
export {};
