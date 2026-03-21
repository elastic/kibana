import type { ObjectType } from '@kbn/config-schema';
import type { getDrilldownRegistry } from '../drilldowns/registry';
import type { EmbeddableTransformsSetup } from './types';
export declare function getTransformsRegistry(drilldownRegistry: ReturnType<typeof getDrilldownRegistry>): {
    registerTransforms: (type: string, transforms: EmbeddableTransformsSetup<any, any>) => void;
    getAllEmbeddableSchemas: () => {
        [key: string]: ObjectType<any>;
    };
    getEmbeddableTransforms: (type: string) => {
        throwOnUnmappedPanel?: undefined;
        schema?: import("@kbn/config-schema").Type<object> | undefined;
        transformOut?: ((storedState: any, panelReferences?: import("@kbn/content-management-utils").Reference[], containerReferences?: import("@kbn/content-management-utils").Reference[], id?: string) => any) | undefined;
        transformIn?: ((state: any) => {
            state: any;
            references?: import("@kbn/content-management-utils").Reference[];
        }) | undefined;
    };
};
