/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export type { ProjectPickerProps } from './components/project_picker';
export type { ProjectPickerContentProps } from './components/project_picker_content';
export type { ProjectPickerProps as ProjectScopePickerProps } from './components/project_picker_update/project_picker';
export type {
  ProjectPickerFlyoutProps as ProjectScopePickerFlyoutContentProps,
  ProjectPickerFlyoutProps as ProjectScopePickerFlyoutProps,
} from './components/project_picker_update/project_picker_flyout';
export type { ProjectPickerControlsState } from './components/project_picker_update/state/reducers';
export type { HeaderContextMenuItemProps } from './components/project_picker_update/blocks/frame/partials/header';
export type { UseFetchProjectsResult } from './components/use_fetch_projects';
export type {
  CPSProject,
  ProjectTagsResponse,
  CpsLinkedProject,
  ICPSManager,
  ProjectsData,
  CPSAppAccessResolver,
  CPSConfigurationLinks,
} from './types';
export type { ProjectRoutingValue } from '@kbn/cps-common';
export { ProjectPicker, DisabledProjectPicker } from './components/project_picker';
export { ProjectPicker as ProjectScopePicker } from './components/project_picker_update/project_picker';
export {
  ProjectPickerFlyout as ProjectScopePickerFlyout,
  ProjectPickerFlyoutContent as ProjectScopePickerFlyoutContent,
} from './components/project_picker_update/project_picker_flyout';
export { ProjectPickerContent } from './components/project_picker_content';
export { ProjectPickerContainer } from './components/project_picker_container';
export { useFetchProjects } from './components/use_fetch_projects';
export { useCpsPickerAccess } from './components/use_cps_picker_access';
export { useIsCpsMultiProject } from './components/use_is_cps_multi_project';
export { useRouteBasedCpsPickerAccess } from './components/use_route_based_cps_picker_access';
export type {
  ProjectRoutingExpression,
  ProjectRoutingStrategy,
} from './components/project_picker_update/utils/project_routing_codec';
export { projectRoutingCodec } from './components/project_picker_update/utils/project_routing_codec';
export { PROJECT_ROUTING } from '@kbn/cps-common';
export { ProjectRoutingAccess } from './types';
export { getCSPLabel, getSolutionIcon, getProjectTags } from './components/utils';
