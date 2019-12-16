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

import Joi from 'joi';
import { sampleDataSchema } from './data_set_schema';
import { createListRoute, createInstallRoute, createUninstallRoute } from './routes';
import { flightsSpecProvider, logsSpecProvider, ecommerceSpecProvider } from './data_sets';
import { makeSampleDataUsageCollector } from './usage';

export function sampleDataMixin(kbnServer, server) {
  server.route(createListRoute());
  server.route(createInstallRoute());
  server.route(createUninstallRoute());

  const sampleDatasets = [];

  server.decorate('server', 'getSampleDatasets', () => {
    return sampleDatasets;
  });

  server.decorate('server', 'registerSampleDataset', specProvider => {
    const { error, value } = Joi.validate(specProvider(server), sampleDataSchema);

    if (error) {
      throw new Error(`Unable to register sample dataset spec because it's invalid. ${error}`);
    }

    const defaultIndexSavedObjectJson = value.savedObjects.find(savedObjectJson => {
      return savedObjectJson.type === 'index-pattern' && savedObjectJson.id === value.defaultIndex;
    });
    if (!defaultIndexSavedObjectJson) {
      throw new Error(
        `Unable to register sample dataset spec, defaultIndex: "${value.defaultIndex}" does not exist in savedObjects list.`
      );
    }

    const dashboardSavedObjectJson = value.savedObjects.find(savedObjectJson => {
      return savedObjectJson.type === 'dashboard' && savedObjectJson.id === value.overviewDashboard;
    });
    if (!dashboardSavedObjectJson) {
      throw new Error(
        `Unable to register sample dataset spec, overviewDashboard: "${value.overviewDashboard}" does not exist in savedObjects list.`
      );
    }

    sampleDatasets.push(value);
  });

  server.decorate('server', 'addSavedObjectsToSampleDataset', (id, savedObjects) => {
    const sampleDataset = sampleDatasets.find(sampleDataset => {
      return sampleDataset.id === id;
    });

    if (!sampleDataset) {
      throw new Error(`Unable to find sample dataset with id: ${id}`);
    }

    sampleDataset.savedObjects = sampleDataset.savedObjects.concat(savedObjects);
  });

  server.decorate('server', 'addAppLinksToSampleDataset', (id, appLinks) => {
    const sampleDataset = sampleDatasets.find(sampleDataset => {
      return sampleDataset.id === id;
    });

    if (!sampleDataset) {
      throw new Error(`Unable to find sample dataset with id: ${id}`);
    }

    sampleDataset.appLinks = sampleDataset.appLinks.concat(appLinks);
  });

  server.decorate(
    'server',
    'replacePanelInSampleDatasetDashboard',
    ({
      sampleDataId,
      dashboardId,
      oldEmbeddableId,
      embeddableId,
      embeddableType,
      embeddableConfig = {},
    }) => {
      const sampleDataset = sampleDatasets.find(sampleDataset => {
        return sampleDataset.id === sampleDataId;
      });
      if (!sampleDataset) {
        throw new Error(`Unable to find sample dataset with id: ${sampleDataId}`);
      }

      const dashboard = sampleDataset.savedObjects.find(savedObject => {
        return savedObject.id === dashboardId && savedObject.type === 'dashboard';
      });
      if (!dashboard) {
        throw new Error(`Unable to find dashboard with id: ${dashboardId}`);
      }

      try {
        const reference = dashboard.references.find(reference => {
          return reference.id === oldEmbeddableId;
        });
        if (!reference) {
          throw new Error(`Unable to find reference for embeddable: ${oldEmbeddableId}`);
        }
        reference.type = embeddableType;
        reference.id = embeddableId;

        const panels = JSON.parse(dashboard.attributes.panelsJSON);
        const panel = panels.find(panel => {
          return panel.panelRefName === reference.name;
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
    }
  );

  server.registerSampleDataset(flightsSpecProvider);
  server.registerSampleDataset(logsSpecProvider);
  server.registerSampleDataset(ecommerceSpecProvider);

  makeSampleDataUsageCollector(server);
}
