import type { PersistableState } from '@kbn/kibana-utils-plugin/common';
import type { EmbeddableStateWithType } from './types';
export declare const getTelemetryFunction: (getEmbeddableFactory: (embeddableFactoryId: string) => PersistableState<EmbeddableStateWithType>) => (state: EmbeddableStateWithType, telemetryData?: Record<string, string | number | boolean>) => Record<string, any>;
