/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import Joi from 'joi';
import { CoreSetup, PluginInitializerContext } from 'src/core/server';
import { SavedObject } from 'src/core/public';
import {
  SampleDatasetProvider,
  SampleDatasetSchema,
  AppLinkSchema,
  SampleDatasetDashboardPanel,
} from './lib/sample_dataset_registry_types';
import { sampleDataSchema } from './lib/sample_dataset_schema';

import { flightsSpecProvider, logsSpecProvider, ecommerceSpecProvider } from './data_sets';
import { createListRoute, createInstallRoute } from './routes';
import { UsageCollectionSetup } from '../../../../usage_collection/server';
import { makeSampleDataUsageCollector, usage } from './usage';
import { createUninstallRoute } from './routes/uninstall';

const flightsSampleDataset = flightsSpecProvider();
const logsSampleDataset = logsSpecProvider();
const ecommerceSampleDataset = ecommerceSpecProvider();

export class SampleDataRegistry {
  constructor(private readonly initContext: PluginInitializerContext) {}
  private readonly sampleDatasets: SampleDatasetSchema[] = [
    flightsSampleDataset,
    logsSampleDataset,
    ecommerceSampleDataset,
  ];

  public setup(core: CoreSetup, usageCollections: UsageCollectionSetup | undefined) {
    if (usageCollections) {
      makeSampleDataUsageCollector(usageCollections, this.initContext);
    }
    const usageTracker = usage(
      core.getStartServices().then(([coreStart]) => coreStart.savedObjects),
      this.initContext.logger.get('sample_data', 'usage')
    );
    const router = core.http.createRouter();
    createListRoute(router, this.sampleDatasets);
    createInstallRoute(
      router,
      this.sampleDatasets,
      this.initContext.logger.get('sampleData'),
      usageTracker
    );
    createUninstallRoute(router, this.sampleDatasets, usageTracker);

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
        const sampleDataset = this.sampleDatasets.find((dataset) => {
          return dataset.id === id;
        });

        if (!sampleDataset) {
          throw new Error(`Unable to find sample dataset with id: ${id}`);
        }

        sampleDataset.savedObjects = sampleDataset.savedObjects.concat(savedObjects);
      },

      addAppLinksToSampleDataset: (id: string, appLinks: AppLinkSchema[]) => {
        const sampleDataset = this.sampleDatasets.find((dataset) => {
          return dataset.id === id;
        });

        if (!sampleDataset) {
          throw new Error(`Unable to find sample dataset with id: ${id}`);
        }

        sampleDataset.appLinks = sampleDataset.appLinks
          ? sampleDataset.appLinks.concat(appLinks)
          : [];
      },

      replacePanelInSampleDatasetDashboard: ({
        sampleDataId,
        dashboardId,
        oldEmbeddableId,
        embeddableId,
        embeddableType,
        embeddableConfig,
      }: SampleDatasetDashboardPanel) => {
        const sampleDataset = this.sampleDatasets.find((dataset) => {
          return dataset.id === sampleDataId;
        });
        if (!sampleDataset) {
          throw new Error(`Unable to find sample dataset with id: ${sampleDataId}`);
        }

        const dashboard = sampleDataset.savedObjects.find((savedObject) => {
          return savedObject.id === dashboardId && savedObject.type === 'dashboard';
        }) as SavedObject<{ panelsJSON: string }>;
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
            return panelItem.panelRefName === reference.name;
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
