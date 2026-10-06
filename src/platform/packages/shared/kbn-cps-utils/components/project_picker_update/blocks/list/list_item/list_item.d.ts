/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type React from 'react';
import type { CPSProject } from '../../../../../types';
import type { ProjectPickerStateProviderProps } from '../../../state';
export interface ProjectPickerListItemProps {
  controlsState: NonNullable<ProjectPickerStateProviderProps['controlsState']>;
  isSelected: boolean;
  isToggleDisabled?: boolean;
  /** True while a filter/selection edit is awaiting server confirmation; disables all row interactions. */
  isInteractionsDisabled?: boolean;
  isOriginProject: boolean;
  showProjectTags?: boolean;
  toggleDisabledMessage: string;
  project: CPSProject;
  onContextMenu: (project: CPSProject, evt: React.MouseEvent<HTMLAnchorElement>) => void;
  onToggle: (project: CPSProject, checked: boolean) => void;
  onLabelClick: (project: CPSProject, evt: React.MouseEvent<HTMLButtonElement>) => void;
}
/** Builds the test subject for a project list item switch, keeping tests in sync with the rendered id. */
export declare const getProjectPickerListItemSwitchTestSubj: (
  projectId: CPSProject['_id']
) => string;
export declare const ProjectPickerListItem: React.MemoExoticComponent<
  ({
    controlsState,
    isSelected,
    isToggleDisabled,
    isInteractionsDisabled,
    isOriginProject,
    showProjectTags,
    toggleDisabledMessage,
    project,
    onContextMenu,
    onToggle,
    onLabelClick,
  }: ProjectPickerListItemProps) => React.JSX.Element
>;
