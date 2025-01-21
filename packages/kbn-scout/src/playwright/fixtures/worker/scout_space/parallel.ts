/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { UiSettingValues } from '@kbn/test/src/kbn_client/kbn_client_ui_settings';
import { formatTime, isValidUTCDate, serviceLoadedMsg } from '../../../utils';
import { coreWorkerFixtures } from '..';
import { ImportSavedObjects, ScoutSpaceParallelFixture } from '.';

export const scoutSpaceParallelFixture = coreWorkerFixtures.extend<
  {},
  { scoutSpace: ScoutSpaceParallelFixture }
>({
  scoutSpace: [
    async ({ log, kbnClient }, use, workerInfo) => {
      const id = `test-space-${workerInfo.workerIndex}`;
      const spacePayload = {
        id,
        name: id,
        disabledFeatures: [],
      };
      log.debug(`Creating space ${id}`);
      await kbnClient.spaces.create(spacePayload);

      // cache saved objects ids in space
      const savedObjectsCache = new Map<string, string>();

      const load = async (path: string) => {
        const response = await kbnClient.importExport.load(path, {
          space: id,
          createNewCopies: true,
        });

        const results = (response.successResults as ImportSavedObjects[]).map(
          (r: { type: string; destinationId: string; meta: { title: string } }) => {
            return { id: r.destinationId, type: r.type, title: r.meta.title };
          }
        );

        results.forEach((r) => savedObjectsCache.set(r.title, r.id));

        return results;
      };

      const cleanStandardList = async () => {
        return kbnClient.savedObjects.cleanStandardList({
          space: id,
        });
      };

      const setDefaultIndex = async (dataViewName: string) => {
        if (savedObjectsCache.has(dataViewName)) {
          await kbnClient.uiSettings.update(
            {
              defaultIndex: savedObjectsCache.get(dataViewName)!,
            },
            { space: id }
          );
        } else {
          throw new Error(`Data view id ${dataViewName} not found in space ${id}`);
        }
      };

      const set = async (values: UiSettingValues) => {
        log.info(`Setting UI settings for space ${id}: ${JSON.stringify(values)}`);
        return kbnClient.uiSettings.update(values, { space: id });
      };

      const unset = async (...keys: string[]) => {
        log.info(`Unsetting UI settings for space ${id}: ${keys}`);
        return Promise.all(keys.map((key) => kbnClient.uiSettings.unset(key, { space: id })));
      };
      const setDefaultTime = async ({ from, to }: { from: string; to: string }) => {
        const utcFrom = isValidUTCDate(from) ? from : formatTime(from);
        const untcTo = isValidUTCDate(to) ? to : formatTime(to);
        await kbnClient.uiSettings.update(
          {
            'timepicker:timeDefaults': `{ "from": "${utcFrom}", "to": "${untcTo}"}`,
          },
          { space: id }
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

      log.debug(serviceLoadedMsg(`scoutSpace`));
      await use({ savedObjects, uiSettings, id });

      // Cleanup space after tests via API call
      log.debug(`Deleting space ${id}`);
      await kbnClient.spaces.delete(id);
    },
    { scope: 'worker', auto: true },
  ],
});
