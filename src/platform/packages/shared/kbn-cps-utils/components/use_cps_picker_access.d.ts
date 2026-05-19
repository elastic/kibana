import type { Observable } from 'rxjs';
import type { ICPSManager, CPSAppAccessResolver } from '../types';
interface UseCpsPickerAccessParams {
    /** The access resolver function - called to determine access for a given location */
    resolver: CPSAppAccessResolver;
    /** Observable of the current app ID */
    currentAppId$: Observable<string | undefined>;
    /** The CPS manager instance (may be undefined if CPS is disabled) */
    cpsManager?: ICPSManager;
}
/**
 * Registers a CPS picker access resolver for the current app.
 * Automatically cleans up (sets DISABLED) on unmount.
 *
 * Consumers are responsible for providing their own resolver logic
 * based on their routing patterns.
 *
 * NOTE: Call this hook only once per rendered page (at the top-level page component).
 * Calling it in nested sub-routes or sub-components risks the cleanup of an inner instance
 * overwriting the CPS state set by an outer one.
 */
export declare const useCpsPickerAccess: ({ resolver, currentAppId$, cpsManager, }: UseCpsPickerAccessParams) => void;
export {};
