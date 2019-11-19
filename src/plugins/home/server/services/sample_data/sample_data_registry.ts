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
    getSampleDatasets
    registerSampleDataset
    addSavedObjectsToSampleDataset
    addAppLinksToSampleDataset
    replacePanelInSampleDatasetDashboard
  During the start phase of the sample_data_registry, we expose the methods that use the setup methods:
  `getSampleDataSets returns the array of sample data sets, similarly to
*/
import Joi from 'joi';
import { CoreSetup } from 'src/core/server';
import { SampleDatasetProvider, SampleDatasetSchema } from './lib/data_set_registry_types';
import { sampleDataSchema } from './lib/data_set_schema';

export class SampleDataRegistry {
  private readonly sampleDatasets: SampleDatasetSchema[] = [];

  public setup(core: CoreSetup) {
    return {
      registerSampleDataset: (specProvider: SampleDatasetProvider) => {
        const emptyContext = {};
        const { error, value } = Joi.validate(specProvider(emptyContext), sampleDataSchema);

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
    };
  }
}
