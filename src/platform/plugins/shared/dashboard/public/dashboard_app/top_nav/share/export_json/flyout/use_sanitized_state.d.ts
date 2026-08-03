import type { ExportJsonSanitizedState, SanitizeStateFunction } from './types';
export type UseSanitizedStateResult<SanitizedState extends object> = ExportJsonSanitizedState<SanitizedState> & {
    retry: () => void;
};
export declare function useSanitizedState<State extends object, SanitizedState extends object>({ state, sanitizeState, }: {
    state: State;
    sanitizeState: SanitizeStateFunction<State, SanitizedState>;
}): UseSanitizedStateResult<SanitizedState>;
