/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { ContainerOutput } from '@kbn/embeddable-plugin/public';
import type { ReduxEmbeddableState } from '@kbn/presentation-util-plugin/public';
import type { DashboardContainerByValueInput } from '../../common/dashboard_container/types';

export type DashboardReduxState = ReduxEmbeddableState<
  DashboardContainerByValueInput,
  DashboardContainerOutput,
  DashboardPublicState
>;

export type DashboardStateFromSaveModal = Pick<
  DashboardContainerByValueInput,
  'title' | 'description' | 'tags' | 'timeRestore' | 'timeRange' | 'refreshInterval'
> &
  Pick<DashboardPublicState, 'lastSavedId'>;

export interface DashboardPublicState {
  lastSavedInput: DashboardContainerByValueInput;
  isEmbeddedExternally?: boolean;
  hasUnsavedChanges?: boolean;
  expandedPanelId?: string;
  fullScreenMode?: boolean;
  savedQueryId?: string;
  lastSavedId?: string;
}

export interface DashboardRenderPerformanceStats {
  lastTimeToData: number;
  panelsRenderDoneTime: number;
  panelsRenderStartTime: number;
}

export interface DashboardContainerOutput extends ContainerOutput {
  usedDataViewIds?: string[];
}

export type DashboardLoadedEventStatus = 'done' | 'error';

export interface DashboardLoadedEventMeta {
  status: DashboardLoadedEventStatus;
}

export interface DashboardSaveOptions {
  newTitle: string;
  newTags?: string[];
  newDescription: string;
  newCopyOnSave: boolean;
  newTimeRestore: boolean;
  onTitleDuplicate: () => void;
  isTitleDuplicateConfirmed: boolean;
}
