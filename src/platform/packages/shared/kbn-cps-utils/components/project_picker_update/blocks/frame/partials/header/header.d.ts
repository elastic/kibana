/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { type EuiContextMenuItemProps } from '@elastic/eui';
import type React from 'react';
import type { ProjectPickerState } from '../../../../state/reducers';
interface HeaderContextMenuClickActionContext {
  state: ProjectPickerState;
}
export interface HeaderContextMenuItemProps
  extends Pick<EuiContextMenuItemProps, 'icon' | 'onClick' | 'href' | 'external' | 'disabled'> {
  label: string;
  testSubj: string;
  isDisabled?: (props: HeaderContextMenuClickActionContext) => boolean;
}
export interface ProjectPickerFrameHeaderActionsProps {
  customContextMenuItems?: HeaderContextMenuItemProps[];
}
export declare function ProjectPickerFrameHeaderActions({
  customContextMenuItems,
}: ProjectPickerFrameHeaderActionsProps): React.JSX.Element | null;
interface ProjectPickerFrameHeaderProps extends ProjectPickerFrameHeaderActionsProps {
  customHeaderText?: React.ReactNode;
}
export declare function ProjectPickerFrameHeader({
  customContextMenuItems,
  customHeaderText,
}: ProjectPickerFrameHeaderProps): React.JSX.Element;
export {};
