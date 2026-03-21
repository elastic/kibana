import type { CoreSetup, CoreStart, Plugin } from '@kbn/core/server';
import type { PersistableStateService, MigrateFunctionsObject } from '@kbn/kibana-utils-plugin/common';
import type { ObjectType, Type } from '@kbn/config-schema';
import type { EmbeddableRegistryDefinition } from './types';
import type { EmbeddableStateWithType } from './persistable_state/types';
import type { EmbeddableTransforms } from '../common';
import type { DrilldownSetup, DrilldownState } from './drilldowns/types';
import type { EmbeddableTransformsSetup } from './embeddable_transforms/types';
export interface EmbeddableSetup extends PersistableStateService<EmbeddableStateWithType> {
    registerEmbeddableFactory: (factory: EmbeddableRegistryDefinition) => void;
    registerDrilldown: <StoredState extends DrilldownState = DrilldownState, State extends DrilldownState = DrilldownState>(type: string, drilldown: DrilldownSetup<StoredState, State>) => void;
    registerTransforms: (type: string, transforms: EmbeddableTransformsSetup<any, any>) => void;
    getAllMigrations: () => MigrateFunctionsObject;
}
export type EmbeddableStart = PersistableStateService<EmbeddableStateWithType> & {
    /**
     * Returns all embeddable schemas registered with registerTransforms.
     */
    getAllEmbeddableSchemas: () => {
        [key: string]: ObjectType;
    };
    getTransforms: (type: string) => (EmbeddableTransforms & {
        schema?: Type<object>;
        throwOnUnmappedPanel?: EmbeddableTransformsSetup['throwOnUnmappedPanel'];
    }) | undefined;
};
export declare class EmbeddableServerPlugin implements Plugin<EmbeddableSetup, EmbeddableStart> {
    private readonly embeddableFactories;
    private migrateFn;
    private drilldownRegistry;
    private transformsRegistry;
    setup(core: CoreSetup): EmbeddableSetup;
    start(core: CoreStart): EmbeddableStart;
    stop(): void;
    private registerEmbeddableFactory;
    private getEmbeddableFactory;
}
