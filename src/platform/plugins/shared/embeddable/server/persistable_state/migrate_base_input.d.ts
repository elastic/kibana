import type { SavedObjectReference } from '@kbn/core/types';
import type { MigrateFunctionsObject } from '@kbn/kibana-utils-plugin/common';
import type { EmbeddableStateWithType } from './types';
export declare const telemetryBaseEmbeddableInput: (state: EmbeddableStateWithType, telemetryData: Record<string, string | number | boolean>) => Record<string, string | number | boolean>;
export declare const extractBaseEmbeddableInput: (state: EmbeddableStateWithType) => {
    state: EmbeddableStateWithType;
    references: SavedObjectReference[];
};
export declare const injectBaseEmbeddableInput: (state: EmbeddableStateWithType, references: SavedObjectReference[]) => EmbeddableStateWithType;
export declare const baseEmbeddableMigrations: MigrateFunctionsObject;
