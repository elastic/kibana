/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SpacesSolutionViewTourManager } from '@kbn/spaces-plugin/public';
import type { NavigationTourManager } from '@kbn/core-chrome-navigation-tour';
import type { UserProfileServiceStart } from '@kbn/core-user-profile-browser';
import type { ApplicationStart } from '@kbn/core-application-browser';
import type { FeatureFlagsStart } from '@kbn/core-feature-flags-browser';
import { getSideNavVersion } from '@kbn/core-chrome-layout-feature-flags';

/**
 * This tour combines the spaces solution view tour and new navigation tour into a single
 * multi-step tour.
 */
export class SolutionNavigationTourManager {
  constructor(
    private deps: {
      navigationTourManager: NavigationTourManager;
      spacesSolutionViewTourManager: SpacesSolutionViewTourManager;
      userProfile: UserProfileServiceStart;
      capabilities: ApplicationStart['capabilities'];
      featureFlags: FeatureFlagsStart;
    }
  ) {}

  async startTour(): Promise<void> {
    // first start the spaces tour (if applicable)
    const spacesTour = await this.deps.spacesSolutionViewTourManager.startTour();
    if (spacesTour.result === 'started') {
      await this.deps.spacesSolutionViewTourManager.waitForTourEnd();
    }

    // when completes, maybe start the navigation tour (if applicable)
    if (getSideNavVersion(this.deps.featureFlags) !== 'v2') return;
    const hasCompletedTour = await checkTourCompletion(this.deps.userProfile);
    if (hasCompletedTour) return;

    this.deps.navigationTourManager.startTour();
    await this.deps.navigationTourManager.waitForTourEnd();

    await preserveTourCompletion(this.deps.userProfile);
  }
}

const SOLUTION_NAVIGATION_TOUR_KEY = 'solutionNavigationTour:completed';

async function preserveTourCompletion(userProfile: UserProfileServiceStart): Promise<void> {
  try {
    localStorage.setItem(SOLUTION_NAVIGATION_TOUR_KEY, 'true');
    return await userProfile.update({ [SOLUTION_NAVIGATION_TOUR_KEY]: true });
  } catch (e) {
    // ignore
  }
}

async function checkTourCompletion(userProfile: UserProfileServiceStart): Promise<boolean> {
  try {
    const localValue = localStorage.getItem(SOLUTION_NAVIGATION_TOUR_KEY) === 'true';
    if (localValue) return true;

    const profile = await userProfile.getCurrent({
      dataPath: SOLUTION_NAVIGATION_TOUR_KEY,
    });

    if (!profile) return true; // consider completed if we can't fetch the profile

    return profile.data?.[SOLUTION_NAVIGATION_TOUR_KEY] === true;
  } catch (e) {
    // consider completed
    return true;
  }
}
