import type { PersistedState } from '../persisted_state';
import type { SerializedVis } from '../vis';
export declare const saveToLibrary: ({ description, title, serializedVis, uiState, }: {
    description: string | undefined;
    serializedVis: SerializedVis;
    title: string;
    uiState: PersistedState;
}) => Promise<string>;
