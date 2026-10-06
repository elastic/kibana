import React from 'react';
import type { EuiContextMenuItemProps } from '@elastic/eui';
import { type EuiWrappingPopoverProps } from '@elastic/eui';
import type { CPSProject } from '../../../../../types';
import { useProjectPickerActions, useProjectPickerState } from '../../../state';
interface ProjectPickerListClickActionContext {
    activeProject: CPSProject;
    state: ReturnType<typeof useProjectPickerState>;
}
interface ProjectPickerListContextMenuItemProps extends Pick<EuiContextMenuItemProps, 'icon' | 'external'> {
    label: string;
    testSubj: string;
    onClick: (props: Pick<ProjectPickerListClickActionContext, 'activeProject'>) => void;
    isDisabled: (props: ProjectPickerListClickActionContext) => boolean;
}
interface ProjectPickerListItemContextMenuProps extends Pick<EuiWrappingPopoverProps, 'button' | 'isOpen'>, Pick<ProjectPickerListClickActionContext, 'activeProject'> {
    closeHandler: () => void;
}
export declare const getProjectPickerListContextMenuConfig: (actions: ReturnType<typeof useProjectPickerActions>) => Array<ProjectPickerListContextMenuItemProps>;
export declare function ProjectPickerListItemContextMenu({ isOpen, closeHandler, button, activeProject, }: ProjectPickerListItemContextMenuProps): React.JSX.Element;
export {};
