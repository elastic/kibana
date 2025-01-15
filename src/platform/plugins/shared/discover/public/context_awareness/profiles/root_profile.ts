/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Profile } from '../types';
import { AsyncProfileProvider, AsyncProfileService } from '../profile_service';

/**
 * Indicates the current solution type (i.e. Observability, Security, Search)
 */
export enum SolutionType {
  Observability = 'oblt',
  Security = 'security',
  Search = 'search',
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
}

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
