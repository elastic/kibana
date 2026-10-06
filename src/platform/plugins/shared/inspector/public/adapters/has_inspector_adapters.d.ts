import type { Adapters } from '../../common';
export interface HasInspectorAdapters {
    getInspectorAdapters: () => Adapters | undefined;
}
export declare const apiHasInspectorAdapters: (api: unknown | null) => api is HasInspectorAdapters;
