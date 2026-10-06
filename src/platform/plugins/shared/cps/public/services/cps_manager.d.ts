/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ApplicationStart, HttpSetup } from '@kbn/core/public';
import type { CloudStart } from '@kbn/cloud-plugin/public';
import type { Logger } from '@kbn/logging';
import type { ProjectRouting } from '@kbn/es-query';
import type { BehaviorSubject } from 'rxjs';
import type { ProjectRoutingAccess } from '@kbn/cps-utils';
import {
  type CPSAppAccessResolver,
  type ICPSManager,
  type CPSConfigurationLinks,
  type ProjectsData,
} from '@kbn/cps-utils';
/** Builds the Cloud console URL for managing cross-project search links. */
export declare const getManageCrossProjectSearchUrl: (cloud?: CloudStart) => string | undefined;
/**
 * Central service for managing project routing and project data.
 *
 * - Fetches project data from ES via `/internal/cps/projects_tags` endpoint (with caching and retry logic)
 * - Manages current project routing state using observables
 * - projectRouting$ represents temporary UI state; apps should reset to their saved value or spaces project routing on navigation
 */
export declare class CPSManager implements ICPSManager {
  private readonly http;
  private readonly logger;
  private readonly application;
  private readonly cloud?;
  private projectFetcherPromise;
  private defaultProjectRouting;
  private allProjects;
  private readonly readyPromise;
  private readonly appAccessResolvers;
  private currentAppId;
  private currentLocation;
  private readonly projectRouting$;
  private readonly projectPickerAccess$;
  private lastEditableProjectRouting;
  constructor(deps: {
    http: HttpSetup;
    logger: Logger;
    application: ApplicationStart;
    appAccessResolvers?: Map<string, CPSAppAccessResolver>;
    cloud?: CloudStart;
  });
  /**
   * Resolves once the default project routing and total count of projects has been fetched
   */
  whenReady(): Promise<void>;
  /**
   * Initialize the default project routing from the active space.
   * Fetches the default project routing for the current space from the CPS plugin.
   */
  private initializeDefaultProjectRouting;
  /**
   * Get the default project routing value from a global space setting.
   * This is the fallback value used when no app-specific or saved value exists.
   */
  getDefaultProjectRouting(): ProjectRouting;
  updateDefaultProjectRouting(projectRouting: string): void;
  /**
   * Fetches all projects
   */
  private fetchAllProjects;
  /**
   * Returns the total number of projects (origin + linked) across all project routings.
   */
  getTotalProjectCount(): number;
  /**
   * Whether the origin project has any linked projects, i.e. cross-project search is
   * actually possible. Reflects data fetched during `whenReady()`, so it returns
   * `false` until that resolves.
   */
  hasLinkedProjects(): boolean;
  /**
   * Get the current project routing as an observable
   */
  getProjectRouting$(): import('rxjs').Observable<ProjectRouting>;
  registerAppAccess(appId: string, resolver: CPSAppAccessResolver): void;
  private applyAccess;
  private resolveAccess;
  /**
   * Set the current project routing
   */
  setProjectRouting(projectRouting: ProjectRouting): void;
  /**
   * Get the current project routing value
   */
  getProjectRouting(overrideValue?: ProjectRouting): ProjectRouting;
  /**
   * Get the project picker access level as an observable.
   * This combines the current app ID and location to determine whether
   * the project picker should be editable, readonly, or disabled.
   */
  getProjectPickerAccess$(): BehaviorSubject<ProjectRoutingAccess>;
  /**
   * Fetches projects from the server with caching and retry logic.
   * Returns cached data if already loaded. If a fetch is already in progress, returns the existing promise.
   * @returns Promise resolving to ProjectsData
   */
  fetchProjects(projectRouting?: ProjectRouting): Promise<ProjectsData | null>;
  private getProjectFetcher;
  getConfigurationLinks(): CPSConfigurationLinks;
}
