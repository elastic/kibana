/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type React from 'react';
import { type ReactNode } from 'react';
import type { ProjectRouting } from '@kbn/es-query';
import { type ProjectPickerStateProviderProps } from './state';
export interface ProjectPickerFlyoutProps
  extends Pick<
    ProjectPickerStateProviderProps,
    | 'availableProjects'
    | 'defaultProjectRoutingGetter'
    | 'controlsState'
    | 'originProjectId'
    | 'fetchProjectsByRouting'
    | 'projectRoutingStrategy'
  > {
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
export declare function ProjectPickerFlyoutContent({
  applyButtonLabel,
  availableProjects,
  backButtonLabel,
  canApplyUnchangedProjectRouting,
  defaultProjectRoutingGetter,
  discardButtonLabel,
  controlsState,
  onApplyChanges,
  onClose,
  fetchProjectsByRouting,
  originProjectId,
  projectRouting,
  projectRoutingStrategy,
  titleId: titleIdProp,
  title,
}: ProjectPickerFlyoutProps): React.JSX.Element;
export declare function ProjectPickerFlyout(props: ProjectPickerFlyoutProps): React.JSX.Element;
