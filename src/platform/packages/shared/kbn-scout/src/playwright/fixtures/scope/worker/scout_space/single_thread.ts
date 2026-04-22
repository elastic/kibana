/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { coreWorkerFixtures } from '..';
import type { ScoutSpaceFixture, SpaceSolutionView } from '.';
import { measurePerformanceAsync } from '../../../../../common';

const DEFAULT_SPACE_ID = 'default';

export const scoutSpaceFixture = coreWorkerFixtures.extend<{}, { scoutSpace: ScoutSpaceFixture }>({
  scoutSpace: [
    async ({ log, kbnClient }, use) => {
      let solutionViewChanged = false;

      const setSolutionView = async (solution: SpaceSolutionView) => {
        return measurePerformanceAsync(
          log,
          `space.setSolutionView({spaceId:'${DEFAULT_SPACE_ID}', solution:'${solution}'})`,
          async () => {
            await kbnClient.request({
              method: 'PUT',
              path: `/internal/spaces/space/${DEFAULT_SPACE_ID}/solution`,
              body: { solution },
            });
            solutionViewChanged = true;
          }
        );
      };

      log.serviceLoaded('scoutSpace');
      await use({ id: DEFAULT_SPACE_ID, setSolutionView });

      // Reset solution view to 'classic' if it was changed during the test
      if (solutionViewChanged) {
        await measurePerformanceAsync(
          log,
          `space.resetSolutionView({spaceId:'${DEFAULT_SPACE_ID}', solution:'classic'})`,
          async () => {
            log.debug(`Resetting solution view to 'classic' for space '${DEFAULT_SPACE_ID}'`);
            await kbnClient.request({
              method: 'PUT',
              path: `/internal/spaces/space/${DEFAULT_SPACE_ID}/solution`,
              body: { solution: 'classic' },
            });
          }
        );
      }
    },
    { scope: 'worker' },
  ],
});
