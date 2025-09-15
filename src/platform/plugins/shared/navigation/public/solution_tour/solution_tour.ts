/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SpacesSolutionViewTourManager } from '@kbn/spaces-plugin/public';

export class SolutionNavigationTourManager {
  constructor(private spacesSolutionViewTourManager: SpacesSolutionViewTourManager) {}

  async startTour(): Promise<void> {
    const spacesTour = await this.spacesSolutionViewTourManager.startTour();

    if (spacesTour.result === 'started') {
      await this.spacesSolutionViewTourManager.waitForTourEnd();
    }

    alert('Solution Navigation Tour has ended.'); // Placeholder for actual tour end handling
  }
}
