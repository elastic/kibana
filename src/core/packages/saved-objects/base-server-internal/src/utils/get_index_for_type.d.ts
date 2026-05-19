import type { ISavedObjectTypeRegistry } from '@kbn/core-saved-objects-server';
interface GetIndexForTypeOptions {
    type: string;
    typeRegistry: ISavedObjectTypeRegistry;
    kibanaVersion: string;
    defaultIndex: string;
}
export declare const getIndexForType: ({ type, typeRegistry, defaultIndex, kibanaVersion, }: GetIndexForTypeOptions) => string;
export {};
