import React, { type ReactNode } from 'react';
import type { ProjectRouting } from '@kbn/es-query';
import { type ProjectPickerStateProviderProps } from './state';
export interface ProjectPickerFlyoutProps extends Pick<ProjectPickerStateProviderProps, 'availableProjects' | 'defaultProjectRoutingGetter' | 'controlsState' | 'originProjectId' | 'fetchProjectsByRouting' | 'projectRoutingStrategy'> {
    projectRouting: ProjectRouting;
    onApplyChanges: (projectRouting: NonNullable<ProjectRouting>) => void;
    onClose: () => void;
    applyButtonLabel?: ReactNode;
    backButtonLabel?: string;
    canApplyUnchangedProjectRouting?: boolean;
    discardButtonLabel?: ReactNode;
    titleId?: string;
    title?: ReactNode;
}
export declare function ProjectPickerFlyoutContent({ applyButtonLabel, availableProjects, backButtonLabel, canApplyUnchangedProjectRouting, defaultProjectRoutingGetter, discardButtonLabel, controlsState, onApplyChanges, onClose, fetchProjectsByRouting, originProjectId, projectRouting, projectRoutingStrategy, titleId: titleIdProp, title, }: ProjectPickerFlyoutProps): React.JSX.Element;
export declare function ProjectPickerFlyout(props: ProjectPickerFlyoutProps): React.JSX.Element;
