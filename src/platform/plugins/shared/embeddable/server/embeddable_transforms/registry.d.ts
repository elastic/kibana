import type { ObjectType, Type } from '@kbn/config-schema';
import type { getDrilldownRegistry } from '../drilldowns/registry';
import type { EmbeddableServerDefinition } from './types';
export declare function getEmbeddableServerRegistry(drilldownRegistry: ReturnType<typeof getDrilldownRegistry>): {
    registerEmbeddableServerDefinition: (type: string, definition: EmbeddableServerDefinition<any, any>) => void;
    getAllEmbeddableSchemas: () => {
        [key: string]: {
            schema: ObjectType;
            title: string;
        };
    };
    getEmbeddableTransforms: (type: string) => {
        throwOnUnmappedPanel?: undefined;
        schema?: Type<object> | undefined;
        transformOut?: ((storedState: any, panelReferences?: import("@kbn/content-management-utils").Reference[], containerReferences?: import("@kbn/content-management-utils").Reference[], id?: string, useGASchemas?: boolean) => any) | undefined;
        transformIn?: ((state: any, useGASchemas?: boolean) => {
            state: any;
            references?: import("@kbn/content-management-utils").Reference[];
        }) | undefined;
    };
    resetCache: () => void;
};
