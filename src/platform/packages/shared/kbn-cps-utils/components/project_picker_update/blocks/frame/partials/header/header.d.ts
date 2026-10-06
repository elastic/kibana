import { type EuiContextMenuItemProps } from '@elastic/eui';
import React from 'react';
import type { ProjectPickerState } from '../../../../state/reducers';
interface HeaderContextMenuClickActionContext {
    state: ProjectPickerState;
}
export interface HeaderContextMenuItemProps extends Pick<EuiContextMenuItemProps, 'icon' | 'onClick' | 'href' | 'external' | 'disabled'> {
    label: string;
    testSubj: string;
    isDisabled?: (props: HeaderContextMenuClickActionContext) => boolean;
}
export interface ProjectPickerFrameHeaderActionsProps {
    customContextMenuItems?: HeaderContextMenuItemProps[];
}
export declare function ProjectPickerFrameHeaderActions({ customContextMenuItems, }: ProjectPickerFrameHeaderActionsProps): React.JSX.Element | null;
interface ProjectPickerFrameHeaderProps extends ProjectPickerFrameHeaderActionsProps {
    customHeaderText?: React.ReactNode;
}
export declare function ProjectPickerFrameHeader({ customContextMenuItems, customHeaderText, }: ProjectPickerFrameHeaderProps): React.JSX.Element;
export {};
