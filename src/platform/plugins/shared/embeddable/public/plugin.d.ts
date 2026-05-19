import type { PluginInitializerContext, CoreSetup, CoreStart, Plugin } from '@kbn/core/public';
import type { EmbeddableSetup, EmbeddableSetupDependencies, EmbeddableStart, EmbeddableStartDependencies } from './types';
import { registerLegacyURLTransform } from './bwc/legacy_url_transform';
import { registerDrilldown } from './drilldowns/registry';
export declare class EmbeddablePublicPlugin implements Plugin<EmbeddableSetup, EmbeddableStart> {
    private stateTransferService;
    private appList?;
    private appListSubscription?;
    constructor(initializerContext: PluginInitializerContext);
    setup(core: CoreSetup, { uiActions }: EmbeddableSetupDependencies): {
        registerDrilldown: typeof registerDrilldown;
        registerEmbeddablePublicDefinition: <SerializedState extends object = object, Api extends import("./react_embeddable_system").DefaultEmbeddableApi<SerializedState> = import("./react_embeddable_system").DefaultEmbeddableApi<SerializedState>>(type: string, getFactory: () => Promise<import("./react_embeddable_system").EmbeddableFactory<SerializedState, Api>>) => void;
        registerAddFromLibraryType: <TSavedObjectAttributes extends import("../../saved_objects_finder/common").FinderAttributes>({ onAdd, savedObjectType, savedObjectName, getIconForSavedObject, getSavedObjectSubType, getTooltipForSavedObject, getSavedObjects, }: {
            onAdd: import("./add_from_library/registry").RegistryItem["onAdd"];
            savedObjectType: string;
            savedObjectName: string;
            getIconForSavedObject: (savedObject: import("../../saved_objects_finder/common").SavedObjectCommon<TSavedObjectAttributes>) => import("@elastic/eui/src/components/icon/icon").IconType;
            getSavedObjectSubType?: (savedObject: import("../../saved_objects_finder/common").SavedObjectCommon<TSavedObjectAttributes>) => string;
            getTooltipForSavedObject?: (savedObject: import("../../saved_objects_finder/common").SavedObjectCommon<TSavedObjectAttributes>) => string;
            getSavedObjects?: import("./add_from_library/registry").RegistryItem["savedObjectMetaData"]["getSavedObjects"];
        }) => void;
        registerLegacyURLTransform: typeof registerLegacyURLTransform;
    };
    start(core: CoreStart, deps: EmbeddableStartDependencies): EmbeddableStart;
    stop(): void;
}
