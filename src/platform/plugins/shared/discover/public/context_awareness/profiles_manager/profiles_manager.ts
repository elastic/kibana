/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isEqual } from 'lodash';
import { BehaviorSubject, skip } from 'rxjs';
import { AbortReason } from '@kbn/kibana-utils-plugin/common';
import type {
  RootProfileService,
  DataSourceProfileService,
  DocumentProfileService,
  RootProfileProviderParams,
  RootContext,
} from '../profiles';
import type { ContextWithProfileId } from '../profile_service';
import type { ScopedDiscoverEBTManager } from '../../ebt_manager';
import type { AppliedProfile } from '../composable_profile';
import { logResolutionError } from './utils';
import { ScopedProfilesManager } from './scoped_profiles_manager';
import { ContextualProfileLevel } from './consts';

interface SerializedRootProfileParams {
  solutionNavId: RootProfileProviderParams['solutionNavId'];
}

/**
 * Result of resolving the root profile
 */
export interface ResolveRootProfileResult {
  /**
   * Render app wrapper accessor
   */
  getRenderAppWrapper: AppliedProfile['getRenderAppWrapper'];
  /**
   * Default ad hoc data views accessor
   */
  getDefaultAdHocDataViews: AppliedProfile['getDefaultAdHocDataViews'];
}

export class ProfilesManager {
  private rootProfile: AppliedProfile;
  private prevRootProfileParams?: SerializedRootProfileParams;
  private rootProfileAbortController?: AbortController;

  private readonly rootContext$: BehaviorSubject<ContextWithProfileId<RootContext>>;

  constructor(
    private readonly rootProfileService: RootProfileService,
    private readonly dataSourceProfileService: DataSourceProfileService,
    private readonly documentProfileService: DocumentProfileService
  ) {
    this.rootContext$ = new BehaviorSubject(rootProfileService.defaultContext);
    this.rootProfile = rootProfileService.getProfile({ context: this.rootContext$.getValue() });

    this.rootContext$.pipe(skip(1)).subscribe((context) => {
      this.rootProfile = rootProfileService.getProfile({ context });
    });
  }

  /**
   * Resolves the root context profile
   * @param params The root profile provider parameters
   */
  public async resolveRootProfile(
    params: RootProfileProviderParams
  ): Promise<ResolveRootProfileResult> {
    const serializedParams = serializeRootProfileParams(params);

    if (isEqual(this.prevRootProfileParams, serializedParams)) {
      return {
        getRenderAppWrapper: this.rootProfile.getRenderAppWrapper,
        getDefaultAdHocDataViews: this.rootProfile.getDefaultAdHocDataViews,
      };
    }

    const abortController = new AbortController();
    this.rootProfileAbortController?.abort(AbortReason.REPLACED);
    this.rootProfileAbortController = abortController;

    let context = this.rootProfileService.defaultContext;

    try {
      context = await this.rootProfileService.resolve(params);
    } catch (e) {
      logResolutionError(ContextualProfileLevel.rootLevel, serializedParams, e);
    }

    if (abortController.signal.aborted) {
      return {
        getRenderAppWrapper: this.rootProfile.getRenderAppWrapper,
        getDefaultAdHocDataViews: this.rootProfile.getDefaultAdHocDataViews,
      };
    }

    this.rootContext$.next(context);
    this.prevRootProfileParams = serializedParams;

    return {
      getRenderAppWrapper: this.rootProfile.getRenderAppWrapper,
      getDefaultAdHocDataViews: this.rootProfile.getDefaultAdHocDataViews,
    };
  }

  /**
   * Creates a profiles manager instance scoped to a single tab with a shared root context
   * @returns The scoped profiles manager
   */
  public createScopedProfilesManager({
    scopedEbtManager,
  }: {
    scopedEbtManager: ScopedDiscoverEBTManager;
  }) {
    return new ScopedProfilesManager(
      this.rootContext$,
      () => this.rootProfile,
      this.dataSourceProfileService,
      this.documentProfileService,
      scopedEbtManager
    );
  }
}

const serializeRootProfileParams = (
  params: RootProfileProviderParams
): SerializedRootProfileParams => {
  return {
    solutionNavId: params.solutionNavId,
  };
};
