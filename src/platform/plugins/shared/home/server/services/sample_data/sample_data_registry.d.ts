/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CoreSetup, PluginInitializerContext } from '@kbn/core/server';
import type { SavedObject } from '@kbn/core/public';
import type { UsageCollectionSetup } from '@kbn/usage-collection-plugin/server';
import type { CustomIntegrationsPluginSetup } from '@kbn/custom-integrations-plugin/server';
import type { SampleDatasetDashboardPanel, AppLinkData } from './lib/sample_dataset_registry_types';
export declare class SampleDataRegistry {
  private readonly initContext;
  constructor(initContext: PluginInitializerContext);
  private readonly sampleDatasets;
  private readonly appLinksMap;
  private sampleDataProviderContext?;
  private registerSampleDataSet;
  setup(
    core: CoreSetup,
    usageCollections: UsageCollectionSetup | undefined,
    customIntegrations?: CustomIntegrationsPluginSetup,
    isDevMode?: boolean
  ): {
    getSampleDatasets: () => import('@kbn/utility-types').Writable<
      Readonly<
        {
          darkPreviewImagePath?: string | undefined;
          iconPath?: string | undefined;
          status?: string | undefined;
          statusMsg?: string | undefined;
        } & {
          id: string;
          name: string;
          description: string;
          previewImagePath: string;
          overviewDashboard: string;
          defaultIndex: string;
          savedObjects: Readonly<
            {
              attributes?: any;
              version?: any;
            } & {
              id: string;
              type: string;
              references: any[];
            }
          >[];
          dataIndices: Readonly<
            {
              isDataStream?: boolean | undefined;
              indexSettings?: Record<string, any> | undefined;
            } & {
              id: string;
              dataPath: string;
              fields: Record<string, any>;
              timeFields: string[];
              currentTimeMarker: string;
              preserveDayOfWeekTimeOfDay: boolean;
            }
          >[];
        }
      >
    >[];
    addSavedObjectsToSampleDataset: (id: string, savedObjects: SavedObject[]) => void;
    addAppLinksToSampleDataset: (id: string, appLinks: AppLinkData[]) => void;
    replacePanelInSampleDatasetDashboard: ({
      sampleDataId,
      dashboardId,
      oldEmbeddableId,
      embeddableId,
      embeddableType,
      embeddableConfig,
    }: SampleDatasetDashboardPanel) => void;
  };
  start(): {};
}
/** @public */
export type SampleDataRegistrySetup = ReturnType<SampleDataRegistry['setup']>;
/** @public */
export type SampleDataRegistryStart = ReturnType<SampleDataRegistry['start']>;
