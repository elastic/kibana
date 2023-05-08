/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { ContainerOutput } from '@kbn/embeddable-plugin/public';
import type { ReduxEmbeddableState } from '@kbn/presentation-util-plugin/public';
import type { DashboardContainerInput, DashboardOptions } from '../../common';

export type DashboardReduxState = ReduxEmbeddableState<
  DashboardContainerInput,
  DashboardContainerOutput,
  DashboardPublicState
>;

export type DashboardStateFromSaveModal = Pick<
  DashboardContainerInput,
  'title' | 'description' | 'tags' | 'timeRestore' | 'timeRange' | 'refreshInterval'
> &
  Pick<DashboardPublicState, 'lastSavedId'>;

export type DashboardStateFromSettingsFlyout = DashboardStateFromSaveModal & DashboardOptions;

export interface DashboardPublicState {
  lastSavedInput: DashboardContainerInput;
  isEmbeddedExternally?: boolean;
  hasUnsavedChanges?: boolean;
  hasOverlays?: boolean;
  expandedPanelId?: string;
  fullScreenMode?: boolean;
  savedQueryId?: string;
  lastSavedId?: string;
  scrollToPanelId?: string;
  highlightPanelId?: string;
}

export interface DashboardRenderPerformanceStats {
  lastTimeToData: number;
  panelsRenderDoneTime: number;
  panelsRenderStartTime: number;
}

export type DashboardContainerInputWithoutId = Omit<DashboardContainerInput, 'id'>;

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
