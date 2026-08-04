import React from 'react';
import { RequestAdapter } from '@kbn/inspector-plugin/common';
export interface TrackRequestResult<T> {
    data: T;
    request: object;
    response: object;
}
export interface ChartSectionInspectorContextValue {
    /**
     * The underlying RequestAdapter instance. Pass this to setLensRequestAdapter
     * so the Inspector can display chart section requests.
     */
    requestAdapter: RequestAdapter;
    /**
     * Wraps a fetch function with RequestAdapter lifecycle management.
     * Handles reset, start, json, ok on success, and error on failure.
     *
     * @param name - The display name for the request in the Inspector
     * @param description - A description of the request shown in the Inspector
     * @param fn - An async function that returns { data, request, response }
     * @returns The `data` value from the fn result
     */
    trackRequest: <T>(name: string, description: string, fn: () => Promise<TrackRequestResult<T>>) => Promise<T>;
}
export declare const ChartSectionInspectorContext: React.Context<ChartSectionInspectorContextValue | null>;
interface ChartSectionInspectorProviderProps {
    children: React.ReactNode;
    /**
     * Optional callback for registering the request adapter with the Inspector.
     * When provided, the adapter is synced on mount and cleared on unmount.
     */
    setLensRequestAdapter?: (adapter: RequestAdapter | undefined) => void;
}
export declare const ChartSectionInspectorProvider: ({ children, setLensRequestAdapter, }: ChartSectionInspectorProviderProps) => React.JSX.Element;
export {};
