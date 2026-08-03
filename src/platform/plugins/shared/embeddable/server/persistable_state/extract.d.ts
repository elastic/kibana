import type { PersistableState } from '@kbn/kibana-utils-plugin/common';
import type { EmbeddableStateWithType } from './types';
export declare const getExtractFunction: (getEmbeddableFactory: (embeddableFactoryId: string) => PersistableState<EmbeddableStateWithType>) => (state: EmbeddableStateWithType) => {
    state: EmbeddableStateWithType;
    references: import("@kbn/core/packages/saved-objects/api-server").SavedObjectReference[];
};
