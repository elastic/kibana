import type { PersistableState, PersistableStateDefinition } from '@kbn/kibana-utils-plugin/common';
import type { EmbeddableStateWithType } from './persistable_state/types';
export type EmbeddableFactoryRegistry = Map<string, EmbeddableRegistryItem>;
export interface EmbeddableRegistryItem<P extends EmbeddableStateWithType = EmbeddableStateWithType> extends PersistableState<P> {
    id: string;
}
export interface EmbeddableRegistryDefinition<P extends EmbeddableStateWithType = EmbeddableStateWithType> extends PersistableStateDefinition<P> {
    id: string;
}
