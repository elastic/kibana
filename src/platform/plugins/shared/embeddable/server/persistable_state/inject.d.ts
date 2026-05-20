import type { SavedObjectReference } from '@kbn/core/types';
import type { PersistableState } from '@kbn/kibana-utils-plugin/common';
import type { EmbeddableStateWithType } from './types';
export declare const getInjectFunction: (getEmbeddableFactory: (embeddableFactoryId: string) => PersistableState<EmbeddableStateWithType>) => (state: EmbeddableStateWithType, references: SavedObjectReference[]) => EmbeddableStateWithType;
