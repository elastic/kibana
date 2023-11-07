/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { SerializableControlGroupInput } from '@kbn/controls-plugin/common';
import type { ContainerOutput } from '@kbn/embeddable-plugin/public';
import type { ReduxEmbeddableState } from '@kbn/presentation-util-plugin/public';
import { SerializableRecord } from '@kbn/utility-types';

import type { DashboardContainerInput, DashboardOptions } from '../../common';
import { SavedDashboardPanel } from '../../common/content_management';

export type DashboardReduxState = ReduxEmbeddableState<
  DashboardContainerInput,
  DashboardContainerOutput,
  DashboardPublicState
>;

export type DashboardRedirect = (props: RedirectToProps) => void;
export type RedirectToProps =
  | { destination: 'dashboard'; id?: string; useReplace?: boolean; editMode?: boolean }
  | { destination: 'listing'; filter?: string; useReplace?: boolean };

export type DashboardStateFromSaveModal = Pick<
  DashboardContainerInput,
  'title' | 'description' | 'tags' | 'timeRestore' | 'timeRange' | 'refreshInterval'
> &
  Pick<DashboardPublicState, 'lastSavedId'>;

export type DashboardStateFromSettingsFlyout = DashboardStateFromSaveModal & DashboardOptions;

export interface DashboardPublicState {
  lastSavedInput: DashboardContainerInput;
  hasRunClientsideMigrations?: boolean;
  animatePanelTransforms?: boolean;
  isEmbeddedExternally?: boolean;
  hasUnsavedChanges?: boolean;
  hasOverlays?: boolean;
  expandedPanelId?: string;
  fullScreenMode?: boolean;
  savedQueryId?: string;
  lastSavedId?: string;
  managed?: boolean;
  scrollToPanelId?: string;
  highlightPanelId?: string;
  focusedPanelId?: string;
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

export type DashboardLocatorParams = Partial<
  Omit<
    DashboardContainerInput,
    'panels' | 'controlGroupInput' | 'executionContext' | 'isEmbeddedExternally'
  >
> & {
  /**
   * If given, the dashboard saved object with this id will be loaded. If not given,
   * a new, unsaved dashboard will be loaded up.
   */
  dashboardId?: string;

  /**
   * If not given, will use the uiSettings configuration for `storeInSessionStorage`. useHash determines
   * whether to hash the data in the url to avoid url length issues.
   */
  useHash?: boolean;

  /**
   * When `true` filters from saved filters from destination dashboard as merged with applied filters
   * When `false` applied filters take precedence and override saved filters
   *
   * true is default
   */
  preserveSavedFilters?: boolean;

  /**
   * Search search session ID to restore.
   * (Background search)
   */
  searchSessionId?: string;

  /**
   * List of dashboard panels
   */
  panels?: Array<SavedDashboardPanel & SerializableRecord>; // used SerializableRecord here to force the GridData type to be read as serializable

  /**
   * Control group input
   */
  controlGroupInput?: SerializableControlGroupInput;
};
