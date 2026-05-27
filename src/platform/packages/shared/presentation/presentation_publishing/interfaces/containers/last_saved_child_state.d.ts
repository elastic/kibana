import type { Observable } from 'rxjs';
export interface HasLastSavedChildState<SerializedState extends object = object> {
    lastSavedStateForChild$: (childId: string) => Observable<SerializedState | undefined>;
    getLastSavedStateForChild: (childId: string) => SerializedState | undefined;
}
export declare const apiHasLastSavedChildState: <SerializedState extends object = object>(api: unknown) => api is HasLastSavedChildState<SerializedState>;
