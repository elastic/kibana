/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Profile } from '../types';
import type { AsyncProfileProvider } from '../profile_service';
import { AsyncProfileService } from '../profile_service';

/**
 * Indicates the current solution type (i.e. Observability, Security, Search)
 */
export enum SolutionType {
  Observability = 'oblt',
  Security = 'security',
  Search = 'es',
  Default = 'default',
}

/**
 * The root profile interface
 */
export type RootProfile = Profile;

/**
 * Parameters for the root profile provider `resolve` method
 */
export interface RootProfileProviderParams {
  /**
   * The current solution navigation ID ('oblt', 'security', 'search', or null)
   */
  solutionNavId?: string | null;
}

/**
 * The resulting context object returned by the root profile provider `resolve` method
 */
export interface RootContext {
  /**
   * The current solution type
   */
  solutionType: SolutionType;
  /**
   * Whether solution profiles may resolve in Classic navigation. Set from the
   * `discover:enableSolutionProfilesInClassic` advanced setting; only meaningful when
   * `solutionType` is `Default`. Absent is treated as allowed.
   */
  allowSolutionProfiles?: boolean;
}

/**
 * Whether solution profiles are permitted to resolve for the given root context. Always true outside
 * Classic navigation; in Classic it honors the `allowSolutionProfiles` flag (absent = allowed).
 */
export const areSolutionProfilesAllowed = (
  rootContext: Pick<RootContext, 'solutionType' | 'allowSolutionProfiles'>
): boolean =>
  rootContext.solutionType !== SolutionType.Default || rootContext.allowSolutionProfiles !== false;

export type RootProfileProvider<TProviderContext = {}> = AsyncProfileProvider<
  RootProfile,
  RootProfileProviderParams,
  RootContext & TProviderContext
>;

export class RootProfileService extends AsyncProfileService<RootProfileProvider> {
  constructor() {
    super({
      profileId: 'default-root-profile',
      solutionType: SolutionType.Default,
    });
  }
}
