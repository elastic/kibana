/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { schema } from '@kbn/config-schema';
import { handleErrors } from './util/handle_errors';
import { IRouter, StartServicesAccessor } from '../../../../../core/server';
import type { DataPluginStart, DataPluginStartDependencies } from '../../plugin';

export const registerValidatePatternListActiveRoute = (
  router: IRouter,
  getStartServices: StartServicesAccessor<DataPluginStartDependencies, DataPluginStart>
) => {
  router.post(
    {
      path: '/api/index_patterns/_validate_pattern_list_active',
      validate: {
        body: schema.object({
          id: schema.string(),
          patternList: schema.arrayOf(
            schema.object({ pattern: schema.string(), matchesIndices: schema.boolean() })
          ),
          patternListActive: schema.arrayOf(schema.string()),
          version: schema.string(),
        }),
      },
    },
    router.handleLegacyErrors(
      handleErrors(async (ctx, req, res) => {
        const savedObjectsClient = ctx.core.savedObjects.client;
        const elasticsearchClient = ctx.core.elasticsearch.client.asCurrentUser;

        const { id, patternList, patternListActive, version: currentVersion } = req.body;
        let patterns = { patternList, patternListActive };
        let version = currentVersion;
        const result = await Promise.all(
          patternList.map(({ pattern }) =>
            elasticsearchClient.transport.request({
              method: 'GET',
              path: `/_resolve/index/${encodeURIComponent(pattern)}`,
            })
          )
        );
        let doesPatternNeedUpdate: number[] = [];
        const patternListNew = result.map(({ body: indexLookup }, i) => {
          const matchesIndices = indexLookup.indices && indexLookup.indices.length > 0;
          if (patternList[i].matchesIndices !== matchesIndices) {
            doesPatternNeedUpdate = [...doesPatternNeedUpdate, i];
          }
          return {
            ...patternList[i],
            matchesIndices,
          };
        });
        if (doesPatternNeedUpdate.length > 0) {
          const patternListActiveNew = doesPatternNeedUpdate
            .reduce((acc, iVal) => {
              if (patternList[iVal].matchesIndices && acc.includes(patternList[iVal].pattern)) {
                return acc.filter((pat) => pat !== patternList[iVal].pattern);
              }
              if (!patternList[iVal].matchesIndices && !acc.includes(patternList[iVal].pattern)) {
                return [...acc, patternList[iVal].pattern];
              }
              return acc;
            }, patternListActive)
            .sort();
          patterns = {
            patternListActive: patternListActiveNew,
            patternList: patternListNew,
          };
          const updatedPattern = await savedObjectsClient.update('index-pattern', id, patterns);
          version = updatedPattern.version ?? version;
        }

        return res.ok({ body: { patterns, version } });
        //
        // let changeCount = 0;
        // const doRefreshFields = false;
        //
        // if (patternList !== undefined && patternList !== indexPattern.patternList) {
        //   changeCount++;
        //   indexPattern.patternList = patternList;
        // }
        //
        // if (
        //   patternListActive !== undefined &&
        //   patternListActive !== indexPattern.patternListActive
        // ) {
        //   changeCount++;
        //   indexPattern.patternListActive = patternListActive;
        // }
        //
        // if (changeCount < 1) {
        //   throw new Error('Index pattern change set is empty.');
        // }
        //
        // await indexPatternsService.updateSavedObject(indexPattern);
        //
        // if (doRefreshFields && refresh_fields) {
        //   await indexPatternsService.refreshFields(indexPattern);
        // }

        return res.ok({
          headers: {
            'content-type': 'application/json',
          },
          body: JSON.stringify({
            index_pattern: [],
          }),
        });
      })
    )
  );
};
