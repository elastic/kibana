/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type React from 'react';
import type { EuiContextMenuItemProps } from '@elastic/eui';
import { type EuiWrappingPopoverProps } from '@elastic/eui';
import type { CPSProject } from '../../../../../types';
import type { useProjectPickerActions, useProjectPickerState } from '../../../state';
interface ProjectPickerListClickActionContext {
  activeProject: CPSProject;
  state: ReturnType<typeof useProjectPickerState>;
}
interface ProjectPickerListContextMenuItemProps
  extends Pick<EuiContextMenuItemProps, 'icon' | 'external'> {
  label: string;
  testSubj: string;
  onClick: (props: Pick<ProjectPickerListClickActionContext, 'activeProject'>) => void;
  isDisabled: (props: ProjectPickerListClickActionContext) => boolean;
}
interface ProjectPickerListItemContextMenuProps
  extends Pick<EuiWrappingPopoverProps, 'button' | 'isOpen'>,
    Pick<ProjectPickerListClickActionContext, 'activeProject'> {
  closeHandler: () => void;
}
export declare const getProjectPickerListContextMenuConfig: (
  actions: ReturnType<typeof useProjectPickerActions>
) => Array<ProjectPickerListContextMenuItemProps>;
export declare function ProjectPickerListItemContextMenu({
  isOpen,
  closeHandler,
  button,
  activeProject,
}: ProjectPickerListItemContextMenuProps): React.JSX.Element;
export {};
