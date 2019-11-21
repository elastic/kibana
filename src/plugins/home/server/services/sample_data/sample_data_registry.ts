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

/*
  Plugin to relace the sample_data methods in the legacy code:

  During the setup phase of the sample_data_registry, the following methods are exposed:
    getSampleDatasets DONE
    registerSampleDataset DONE
    addSavedObjectsToSampleDataset DONE
    addAppLinksToSampleDataset DONE
    replacePanelInSampleDatasetDashboard DONE
  During the start phase of the sample_data_registry, we expose the methods that use the setup methods:
  `getSampleDataSets returns the array of sample data sets, similarly to

  Another question:
  sample data is registered at the end of the file in src/legacy/server/sample_data/sample_data_mixin.js
  Does this service need to do the registration itself? Yes, initialize the array with them!
  DONE

  TODO:
    createListRoute
    createInstallRoute
    createUninstallRoute
  They go into the setup phase before the return methods.

*/
import Joi from 'joi';
import { CoreSetup } from 'src/core/server';
import { SavedObject } from 'src/core/public';
import {
  SampleDatasetProvider,
  SampleDatasetSchema,
  AppLinkSchema,
  EmbeddableTypes,
} from './lib/sample_dataset_registry_types';
import { sampleDataSchema } from './lib/sample_dataset_schema';
import { createIndexName } from './lib/create_index_name';
import { flightsSpecProvider, logsSpecProvider, ecommerceSpecProvider } from './data_sets';

const flightsSampleDataset = flightsSpecProvider();
const logsSampleDataset = logsSpecProvider();
const ecommerceSampleDataset = ecommerceSpecProvider();
export class SampleDataRegistry {
  // Initialize the array with built-in Kibana sample Datasets
  private readonly sampleDatasets: SampleDatasetSchema[] = [
    flightsSampleDataset,
    logsSampleDataset,
    ecommerceSampleDataset,
  ];

  public setup(core: CoreSetup) {
    // createListRoute()

    const router = core.http.createRouter();
    router.get({ path: '/api/sample_data', validate: false }, async (context, req, res) => {
      const response = await context.core.elasticsearch.dataClient.callAsCurrentUser(
        'indices.exists',
        { index: 'kibana_sample_data_ecommerce' }
      );
      return res.ok({ body: `Index exists: ${response}` });
    });
    //     const sampleDatasets = this.sampleDatasets.map(dataset => {
    //       return {
    //         id: dataset.id,
    //         name: dataset.name,
    //         description: dataset.description,
    //         previewImagePath: dataset.previewImagePath,
    //         darkPreviewImagePath: dataset.darkPreviewImagePath,
    //         overviewDashboard: dataset.overviewDashboard,
    //         appLinks: dataset.appLinks,
    //         defaultIndex: dataset.defaultIndex,
    //         dataIndices: dataset.dataIndices.map(({ id }) => ({ id })),
    //       };
    //     });
    //     const isInstalledPromises = this.sampleDatasets.map(async sampleDataset => {
    //       for (let i = 0; i < sampleDataset.dataIndices.length; i++) {
    //         const dataIndexConfig = sampleDataset.dataIndices[i];
    //         const index = createIndexName(sampleDataset.id, dataIndexConfig.id);
    //         try {

    //         }
    //       }
    //     })
    // });
    return {
      registerSampleDataset: (specProvider: SampleDatasetProvider) => {
        const { error, value } = Joi.validate(specProvider(), sampleDataSchema);

        if (error) {
          throw new Error(`Unable to register sample dataset spec because it's invalid. ${error}`);
        }
        const defaultIndexSavedObjectJson = value.savedObjects.find((savedObjectJson: any) => {
          return (
            savedObjectJson.type === 'index-pattern' && savedObjectJson.id === value.defaultIndex
          );
        });
        if (!defaultIndexSavedObjectJson) {
          throw new Error(
            `Unable to register sample dataset spec, defaultIndex: "${value.defaultIndex}" does not exist in savedObjects list.`
          );
        }

        const dashboardSavedObjectJson = value.savedObjects.find((savedObjectJson: any) => {
          return (
            savedObjectJson.type === 'dashboard' && savedObjectJson.id === value.overviewDashboard
          );
        });
        if (!dashboardSavedObjectJson) {
          throw new Error(
            `Unable to register sample dataset spec, overviewDashboard: "${value.overviewDashboard}" does not exist in savedObject list.`
          );
        }
        this.sampleDatasets.push(value);
      },
      getSampleDatasets: () => this.sampleDatasets,

      addSavedObjectsToSampleDataset: (id: string, savedObjects: SavedObject[]) => {
        const sampleDataset = this.sampleDatasets.find(dataset => {
          return dataset.id === id;
        });

        if (!sampleDataset) {
          throw new Error(`Unable to find sample dataset with id: ${id}`);
        }

        sampleDataset.savedObjects = sampleDataset.savedObjects.concat(savedObjects);
      },

      addAppLinksToSampleDataset: (id: string, appLinks: AppLinkSchema[]) => {
        const sampleDataset = this.sampleDatasets.find(dataset => {
          return dataset.id === id;
        });

        if (!sampleDataset) {
          throw new Error(`Unable to find sample dataset with id: ${id}`);
        }

        sampleDataset.appLinks = sampleDataset.appLinks!.concat(appLinks);
      },

      replacePanelInSampleDatasetDashboard: (
        sampleDataId: string,
        dashboardId: string,
        oldEmbeddableId: string,
        embeddableId: string,
        embeddableType: EmbeddableTypes,
        embeddableConfig: object = {}
      ) => {
        const sampleDataset = this.sampleDatasets.find(dataset => {
          return dataset.id === sampleDataId;
        });
        if (!sampleDataset) {
          throw new Error(`Unaable to find sample dataset with id: ${sampleDataId}`);
        }

        const dashboard = sampleDataset.savedObjects.find((savedObject: SavedObject) => {
          return savedObject.id === dashboardId && savedObject.type === 'dashboard';
        });
        if (!dashboard) {
          throw new Error(`Unable to find dashboard with id: ${dashboardId}`);
        }
        try {
          const reference = dashboard.references.find((referenceItem: any) => {
            return referenceItem.id === oldEmbeddableId;
          });
          if (!reference) {
            throw new Error(`Unable to find reference for embeddable: ${oldEmbeddableId}`);
          }
          reference.type = embeddableType;
          reference.id = embeddableId;

          const panels = JSON.parse(dashboard.attributes.panelsJSON);
          const panel = panels.find((panelItem: any) => {
            return (panelItem.panelRefName = reference.name);
          });
          if (!panel) {
            throw new Error(`Unable to find panel for reference: ${reference.name}`);
          }
          panel.embeddableConfig = embeddableConfig;
          dashboard.attributes.panelsJSON = JSON.stringify(panels);
        } catch (error) {
          throw new Error(
            `Unable to replace panel with embeddable ${oldEmbeddableId}, error: ${error}`
          );
        }
      },
    };
  }

  public start() {
    return {};
  }
}
/** @public */
export type SampleDataRegistrySetup = ReturnType<SampleDataRegistry['setup']>;

/** @public */
export type SampleDataRegistryStart = ReturnType<SampleDataRegistry['start']>;
