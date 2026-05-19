import type { ContentListStateContextValue } from './types';
/**
 * Context for the content list state.
 *
 * @internal Use `useContentListState` hook to access this context.
 */
export declare const ContentListStateContext: import("react").Context<ContentListStateContextValue | null>;
/**
 * Hook to access the content list state and dispatch function.
 *
 * This is a low-level hook. For most use cases, prefer the feature-specific hooks
 * like `useContentListSort`, `useContentListItems`, etc.
 *
 * @throws Error if used outside `ContentListProvider`.
 * @returns The state context value including state, dispatch, and refetch.
 */
export declare const useContentListState: () => ContentListStateContextValue;
