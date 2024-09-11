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

export enum SolutionType {
  Observability = 'oblt',
  Security = 'security',
  Search = 'search',
  Default = 'default',
}

export type RootProfile = Profile;

export interface RootProfileProviderParams {
  solutionNavId?: string | null;
}

export interface RootContext {
  solutionType: SolutionType;
}

export type RootProfileProvider = AsyncProfileProvider<
  RootProfile,
  RootProfileProviderParams,
  RootContext
>;

export class RootProfileService extends AsyncProfileService<
  RootProfile,
  RootProfileProviderParams,
  RootContext
> {
  constructor() {
    super({
      profileId: 'default-root-profile',
      solutionType: SolutionType.Default,
    });
  }
}
