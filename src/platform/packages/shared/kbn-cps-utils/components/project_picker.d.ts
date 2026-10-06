/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type React from 'react';
import { type ComponentProps } from 'react';
import { TOUR_STORAGE_KEY } from './use_project_picker_tour';
import type { ProjectPickerButton, ProjectPickerFrame } from './project_picker_update/blocks';
import type { ProjectPickerStateProvider } from './project_picker_update/state';
export { TOUR_STORAGE_KEY };
export interface ProjectPickerProps
  extends Pick<
      ComponentProps<typeof ProjectPickerStateProvider>,
      | 'defaultProjectRoutingGetter'
      | 'onProjectRoutingChange'
      | 'currentProjectRoutingGetter'
      | 'fetchProjectsByRouting'
      | 'projectRoutingStrategy'
    >,
    Pick<
      ComponentProps<typeof ProjectPickerFrame>,
      'customHeaderContextMenuItems' | 'maxBodyHeight'
    >,
    Pick<ComponentProps<typeof ProjectPickerButton>, 'customTooltipContent'> {
  isReadonly?: boolean;
  isDisabled?: boolean;
  settingsComponent?: React.ReactNode;
  totalProjectCount: number;
}
export declare const ProjectPicker: ({
  onProjectRoutingChange,
  isReadonly,
  isDisabled,
  defaultProjectRoutingGetter,
  currentProjectRoutingGetter,
  fetchProjectsByRouting,
  totalProjectCount,
  customHeaderContextMenuItems,
  projectRoutingStrategy,
  maxBodyHeight,
  customTooltipContent,
}: ProjectPickerProps) => React.JSX.Element | null;
export declare const ProjectPickerSkeleton: () => React.JSX.Element;
export declare const DisabledProjectPicker: ({
  totalProjectCount,
  customTooltipContent,
}: {
  totalProjectCount: number;
  customTooltipContent?: string;
}) => React.JSX.Element | null;
