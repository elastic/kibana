import type { SerializableRecord } from '@kbn/utility-types';
import type { PersistableState } from '@kbn/kibana-utils-plugin/common';
import type { EmbeddableStateWithType } from './types';
export type MigrateFunction = (state: SerializableRecord, version: string) => SerializableRecord;
export declare const getMigrateFunction: (getEmbeddableFactory: (embeddableFactoryId: string) => PersistableState<EmbeddableStateWithType>) => MigrateFunction;
