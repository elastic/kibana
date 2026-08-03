import type { EmbeddableSetup, EmbeddableStart } from './plugin';
export type { EmbeddableSetup, EmbeddableStart };
export type { EmbeddableRegistryDefinition } from './types';
export type { DrilldownState, SerializedDrilldowns, GetDrilldownsSchemaFnType, } from './drilldowns/types';
export type { EmbeddableTransforms } from './embeddable_transforms/types';
export type { EmbeddableStateWithType, EmbeddablePersistableStateService, } from './persistable_state';
export { transformType } from '../common/bwc/transform_type';
export declare const plugin: () => Promise<import("./plugin").EmbeddableServerPlugin>;
