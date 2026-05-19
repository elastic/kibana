export type UseBooleanUrlStateResult = [boolean, (next: boolean) => void];
/**
 * Binds a boolean value to a URL query parameter via the app's scoped history so
 * browser Back/Forward navigation restores the value. Must be called inside a `<Router>`.
 *
 * Opening (true) pushes a history entry so Back closes; closing (false) replaces the
 * entry and removes the param from the URL.
 */
export declare const useBooleanUrlState: (paramName: string) => UseBooleanUrlStateResult;
