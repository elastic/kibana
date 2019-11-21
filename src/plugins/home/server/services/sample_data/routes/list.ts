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
import { IRouter } from 'src/core/server';
import { SampleDatasetSchema } from '../lib/sample_dataset_registry_types';
import { createIndexName } from '../lib/create_index_name';

const NOT_INSTALLED = 'not_installed';
const INSTALLED = 'installed';
const UNKNOWN = 'unknown';

export const createListRoute = (router: IRouter, sampleDatasets: SampleDatasetSchema[]) => {
  router.get({ path: '/api/sample_data', validate: false }, async (context, req, res) => {
    const registeredSampleDatasets = sampleDatasets.map(dataset => {
      return {
        id: dataset.id,
        name: dataset.name,
        description: dataset.description,
        oreviewImagePath: dataset.previewImagePath,
        darkPreviewImagePath: dataset.darkPreviewImagePath,
        overviewDashboard: dataset.overviewDashboard,
        appLinks: dataset.appLinks,
        defaultIndex: dataset.defaultIndex,
        dataIndices: dataset.dataIndices.map(({ id }) => ({ id })),
      };
    });
    const isInstalledPromises = sampleDatasets.map(async sampleDataset => {
      for (let i = 0; i < sampleDataset.dataIndices.length; i++) {
        const dataIndexConfig = sampleDataset.dataIndices[i];
        const indexOfInterest = createIndexName(sampleDataset.id, dataIndexConfig.id);
        try {
          // indexExists is either a true or false response from elasticsearch
          const indexExists = await context.core.elasticsearch.dataClient.callAsCurrentUser(
            'indices.exists',
            { index: indexOfInterest }
          );
          if (!indexExists) {
            sampleDataset.status = NOT_INSTALLED;
            return;
          }
          const { count } = await context.core.elasticsearch.dataClient.callAsCurrentUser('count', {
            index: indexOfInterest,
          });
          if (count === 0) {
            sampleDataset.status = NOT_INSTALLED;
            return;
          }
        } catch (err) {
          sampleDataset.status = UNKNOWN;
          sampleDataset.statusMsg = err.message;
        }
      }
      try {
        await context.core.savedObjects.client.get('dashboard', sampleDataset.overviewDashboard);
      } catch (err) {
        // savedObjectClient.get() throws an boom error when object is not found.
        if (_.get(err, 'output.statusCode') === 404) {
          sampleDataset.status = NOT_INSTALLED;
          return;
        }

        sampleDataset.status = UNKNOWN;
        sampleDataset.statusMsg = err.message;
        return;
      }

      sampleDataset.status = INSTALLED;
    });
    await Promise.all(isInstalledPromises);

    return res.ok({ body: registeredSampleDatasets });
  });
};
