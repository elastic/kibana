/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { CoreSetup, PluginInitializerContext } from '@kbn/core/server';
import { SavedObject } from '@kbn/core/public';
import { UsageCollectionSetup } from '@kbn/usage-collection-plugin/server';
import { CustomIntegrationsPluginSetup } from '@kbn/custom-integrations-plugin/server';
import {
  SampleDatasetProvider,
  SampleDatasetSchema,
  SampleDatasetDashboardPanel,
  AppLinkData,
} from './lib/sample_dataset_registry_types';
import { sampleDataSchema } from './lib/sample_dataset_schema';

import { flightsSpecProvider, logsSpecProvider, ecommerceSpecProvider } from './data_sets';
import { createListRoute, createInstallRoute } from './routes';
import { makeSampleDataUsageCollector, usage } from './usage';
import { createUninstallRoute } from './routes/uninstall';
import { registerSampleDatasetWithIntegration } from './lib/register_with_integrations';

export class SampleDataRegistry {
  constructor(private readonly initContext: PluginInitializerContext) {}
  private readonly sampleDatasets: SampleDatasetSchema[] = [];
  private readonly appLinksMap = new Map<string, AppLinkData[]>();

  private registerSampleDataSet(specProvider: SampleDatasetProvider) {
    let value: SampleDatasetSchema;
    try {
      value = sampleDataSchema.validate(specProvider());
    } catch (error) {
      throw new Error(`Unable to register sample dataset spec because it's invalid. ${error}`);
    }
    const defaultIndexSavedObjectJson = value.savedObjects.find((savedObjectJson: any) => {
      return savedObjectJson.type === 'index-pattern' && savedObjectJson.id === value.defaultIndex;
    });
    if (!defaultIndexSavedObjectJson) {
      throw new Error(
        `Unable to register sample dataset spec, defaultIndex: "${value.defaultIndex}" does not exist in savedObjects list.`
      );
    }

    const dashboardSavedObjectJson = value.savedObjects.find((savedObjectJson: any) => {
      return savedObjectJson.type === 'dashboard' && savedObjectJson.id === value.overviewDashboard;
    });
    if (!dashboardSavedObjectJson) {
      throw new Error(
        `Unable to register sample dataset spec, overviewDashboard: "${value.overviewDashboard}" does not exist in savedObject list.`
      );
    }
    this.sampleDatasets.push(value);
  }

  public setup(
    core: CoreSetup,
    usageCollections: UsageCollectionSetup | undefined,
    customIntegrations?: CustomIntegrationsPluginSetup
  ) {
    if (usageCollections) {
      const kibanaIndex = core.savedObjects.getKibanaIndex();
      makeSampleDataUsageCollector(usageCollections, kibanaIndex);
    }
    const usageTracker = usage(
      core.getStartServices().then(([coreStart]) => coreStart.savedObjects),
      this.initContext.logger.get('sample_data', 'usage')
    );
    const router = core.http.createRouter();
    const logger = this.initContext.logger.get('sampleData');
    createListRoute(router, this.sampleDatasets, this.appLinksMap, logger);
    createInstallRoute(router, this.sampleDatasets, logger, usageTracker);
    createUninstallRoute(router, this.sampleDatasets, logger, usageTracker);

    this.registerSampleDataSet(flightsSpecProvider);
    this.registerSampleDataSet(logsSpecProvider);
    this.registerSampleDataSet(ecommerceSpecProvider);
    if (customIntegrations && core) {
      registerSampleDatasetWithIntegration(customIntegrations, core);
    }

    return {
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

      addAppLinksToSampleDataset: (id: string, appLinks: AppLinkData[]) => {
        const sampleDataset = this.sampleDatasets.find((dataset) => {
          return dataset.id === id;
        });

        if (!sampleDataset) {
          throw new Error(`Unable to find sample dataset with id: ${id}`);
        }

        const existingAppLinks = this.appLinksMap.get(id) ?? [];
        this.appLinksMap.set(id, [...existingAppLinks, ...appLinks]);
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

          const referenceName = reference.name.includes(':')
            ? reference.name.split(':')[1]
            : reference.name;

          const panels = JSON.parse(dashboard.attributes.panelsJSON);
          const panel = panels.find((panelItem: any) => {
            return panelItem.panelRefName === referenceName;
          });
          if (!panel) {
            throw new Error(`Unable to find panel for reference: ${referenceName}`);
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
