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
    setup(core: CoreSetup, usageCollections: UsageCollectionSetup | undefined, customIntegrations?: CustomIntegrationsPluginSetup, isDevMode?: boolean): {
        getSampleDatasets: () => import("@kbn/utility-types").Writable<Readonly<{
            status?: string | undefined;
            statusMsg?: string | undefined;
            darkPreviewImagePath?: string | undefined;
            iconPath?: string | undefined;
        } & {
            id: string;
            name: string;
            description: string;
            defaultIndex: string;
            overviewDashboard: string;
            previewImagePath: string;
            savedObjects: Readonly<{
                attributes?: any;
                version?: any;
            } & {
                id: string;
                type: string;
                references: any[];
            }>[];
            dataIndices: Readonly<{
                indexSettings?: Record<string, any> | undefined;
                isDataStream?: boolean | undefined;
            } & {
                id: string;
                fields: Record<string, any>;
                dataPath: string;
                timeFields: string[];
                currentTimeMarker: string;
                preserveDayOfWeekTimeOfDay: boolean;
            }>[];
        }>>[];
        addSavedObjectsToSampleDataset: (id: string, savedObjects: SavedObject[]) => void;
        addAppLinksToSampleDataset: (id: string, appLinks: AppLinkData[]) => void;
        replacePanelInSampleDatasetDashboard: ({ sampleDataId, dashboardId, oldEmbeddableId, embeddableId, embeddableType, embeddableConfig, }: SampleDatasetDashboardPanel) => void;
    };
    start(): {};
}
/** @public */
export type SampleDataRegistrySetup = ReturnType<SampleDataRegistry['setup']>;
/** @public */
export type SampleDataRegistryStart = ReturnType<SampleDataRegistry['start']>;
