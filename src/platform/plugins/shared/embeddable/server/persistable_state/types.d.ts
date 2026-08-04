import type { PersistableStateService } from '@kbn/kibana-utils-plugin/common';
import type { SerializableRecord } from '@kbn/utility-types';
export type EmbeddableStateWithType = {
    enhancements?: SerializableRecord;
    type: string;
};
export type EmbeddablePersistableStateService = PersistableStateService<EmbeddableStateWithType>;
