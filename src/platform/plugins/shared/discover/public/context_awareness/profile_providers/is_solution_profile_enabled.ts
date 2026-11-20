/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { IUiSettingsClient } from '@kbn/core/public';
import { ENABLE_SOLUTION_PROFILES_IN_CLASSIC_SETTING } from '@kbn/discover-utils';
import type { ContextWithProfileId } from '../profile_service';
import type { RootContext, SolutionType } from '../profiles';
import { CLASSIC_NAV_ROOT_PROFILE_ID } from './common/classic_nav_root_profile';

/**
 * Whether the root context was resolved by the Classic navigation root profile. `SolutionType.Default`
 * alone is not enough, since it is also the fallback for solution views without a root profile.
 */
export const isClassicNavRootContext = ({
  profileId,
}: ContextWithProfileId<RootContext>): boolean => profileId === CLASSIC_NAV_ROOT_PROFILE_ID;

/**
 * Whether a solution profile may resolve: always in its own solution view, and in Classic navigation
 * unless the `discover:enableSolutionProfilesInClassic` advanced setting is turned off.
 */
export const isSolutionProfileEnabled = (
  rootContext: ContextWithProfileId<RootContext>,
  solutionType: SolutionType,
  uiSettings: IUiSettingsClient
): boolean =>
  rootContext.solutionType === solutionType ||
  (isClassicNavRootContext(rootContext) &&
    uiSettings.get<boolean>(ENABLE_SOLUTION_PROFILES_IN_CLASSIC_SETTING, true));
