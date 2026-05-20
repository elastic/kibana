import type { SerializedTitles } from '@kbn/presentation-publishing';
import type { SerializedDrilldowns } from '@kbn/embeddable-plugin/server';
import type { VisualizeByReferenceState, VisualizeEmbeddableState } from '../../common/embeddable/types';
import type { SerializedVis } from '../vis';
import type { VisualizeRuntimeState, ExtraSavedObjectProperties } from './types';
export declare const deserializeState: (state: VisualizeEmbeddableState | undefined) => Promise<VisualizeRuntimeState>;
export declare const deserializeSavedObjectState: ({ savedObjectId, drilldowns, uiState, time_range, title: embeddableTitle, description: embeddableDescription, hide_title, }: VisualizeByReferenceState) => Promise<VisualizeRuntimeState>;
export declare const serializeState: (props: {
    serializedVis: SerializedVis;
    titles?: SerializedTitles;
    id?: string;
    savedObjectProperties?: ExtraSavedObjectProperties;
    linkedToLibrary?: boolean;
    drilldowns?: SerializedDrilldowns;
    time_range?: VisualizeRuntimeState['time_range'];
}) => VisualizeEmbeddableState;
