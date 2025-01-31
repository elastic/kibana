/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { UiSettingValues } from '@kbn/test/src/kbn_client/kbn_client_ui_settings';
import { formatTime, isValidUTCDate } from '../../../utils';
import { coreWorkerFixtures } from '..';
import { ImportSavedObjects, ScoutSpaceParallelFixture } from '.';
import { measurePerformanceAsync } from '../../../../common';

export const scoutSpaceParallelFixture = coreWorkerFixtures.extend<
  {},
  { scoutSpace: ScoutSpaceParallelFixture }
>({
  scoutSpace: [
    async ({ log, kbnClient }, use, workerInfo) => {
      const spaceId = `test-space-${workerInfo.workerIndex}`;
      const spacePayload = {
        id: spaceId,
        name: spaceId,
        disabledFeatures: [],
      };
      await measurePerformanceAsync(log, `scoutSpace:${spaceId} 'spaces.create'`, async () => {
        return kbnClient.spaces.create(spacePayload);
      });

      // cache saved objects ids in space
      const savedObjectsCache = new Map<string, string>();

      const load = async (path: string) => {
        return measurePerformanceAsync(
          log,
          `scoutSpace:${spaceId} 'savedObjects.load'`,
          async () => {
            const response = await kbnClient.importExport.load(path, {
              space: spaceId,
              // will create new copies of saved objects with unique ids
              createNewCopies: true,
            });

            const imported = (response.successResults as ImportSavedObjects[]).map(
              (r: { type: string; destinationId: string; meta: { title: string } }) => {
                return { id: r.destinationId, type: r.type, title: r.meta.title };
              }
            );

            imported.forEach((so) => savedObjectsCache.set(so.title, so.id));

            return imported;
          }
        );
      };
      const cleanStandardList = async () => {
        return measurePerformanceAsync(
          log,
          `scoutSpace:${spaceId} 'savedObjects.cleanStandardList'`,
          async () => {
            savedObjectsCache.clear();
            await kbnClient.savedObjects.cleanStandardList({
              space: spaceId,
            });
          }
        );
      };
      const setDefaultIndex = async (dataViewName: string) => {
        return measurePerformanceAsync(
          log,
          `scoutSpace:${spaceId} 'savedObjects.setDefaultIndex'`,
          async () => {
            if (savedObjectsCache.has(dataViewName)) {
              return kbnClient.uiSettings.update(
                {
                  defaultIndex: savedObjectsCache.get(dataViewName)!,
                },
                { space: spaceId }
              );
            } else {
              throw new Error(`Data view id ${dataViewName} not found in space ${spaceId}`);
            }
          }
        );
      };
      const set = async (values: UiSettingValues) => {
        return measurePerformanceAsync(log, `scoutSpace:${spaceId} 'uiSettings.set'`, async () => {
          return kbnClient.uiSettings.update(values, { space: spaceId });
        });
      };
      const unset = async (...keys: string[]) => {
        return measurePerformanceAsync(
          log,
          `scoutSpace:${spaceId} 'uiSettings.unset'`,
          async () => {
            return Promise.all(
              keys.map((key) => kbnClient.uiSettings.unset(key, { space: spaceId }))
            );
          }
        );
      };
      const setDefaultTime = async ({ from, to }: { from: string; to: string }) => {
        return measurePerformanceAsync(
          log,
          `scoutSpace:${spaceId} 'uiSettings.setDefaultTime'`,
          async () => {
            const utcFrom = isValidUTCDate(from) ? from : formatTime(from);
            const untcTo = isValidUTCDate(to) ? to : formatTime(to);
            return kbnClient.uiSettings.update(
              {
                'timepicker:timeDefaults': `{ "from": "${utcFrom}", "to": "${untcTo}"}`,
              },
              { space: spaceId }
            );
          }
        );
      };

      const savedObjects = {
        load,
        cleanStandardList,
      };

      const uiSettings = {
        setDefaultIndex,
        set,
        unset,
        setDefaultTime,
      };

      log.serviceLoaded(`scoutSpace:${spaceId}`);
      await use({ savedObjects, uiSettings, id: spaceId });

      // Cleanup space after tests via API call
      await measurePerformanceAsync(log, `scoutSpace:${spaceId} 'space.delete'`, async () => {
        return kbnClient.spaces.delete(spaceId);
      });
    },
    { scope: 'worker', auto: true },
  ],
});
