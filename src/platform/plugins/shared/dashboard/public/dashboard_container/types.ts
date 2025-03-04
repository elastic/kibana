/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { SerializableRecord } from '@kbn/utility-types';

import { ControlGroupRuntimeState } from '@kbn/controls-plugin/public';
import type { DashboardPanel } from '../../server/content_management';
import { DashboardState } from '../dashboard_api/types';

export interface UnsavedPanelState {
  [key: string]: object | undefined;
}

export type DashboardRedirect = (props: RedirectToProps) => void;
export type RedirectToProps =
  | { destination: 'dashboard'; id?: string; useReplace?: boolean; editMode?: boolean }
  | { destination: 'listing'; filter?: string; useReplace?: boolean };

export type DashboardLoadType =
  | 'sessionFirstLoad'
  | 'dashboardFirstLoad'
  | 'dashboardSubsequentLoad';

export interface DashboardRenderPerformanceStats {
  lastTimeToData: number;
  panelsRenderDoneTime: number;
  panelsRenderStartTime: number;
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
  Omit<DashboardState, 'panels' | 'controlGroupInput' | 'references'>
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
  panels?: Array<DashboardPanel & SerializableRecord>; // used SerializableRecord here to force the GridData type to be read as serializable

  /**
   * Control group changes
   */
  controlGroupState?: Partial<ControlGroupRuntimeState> & SerializableRecord; // used SerializableRecord here to force the GridData type to be read as serializable
};
