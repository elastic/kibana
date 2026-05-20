import type { Profile } from '../types';
import type { AsyncProfileProvider } from '../profile_service';
import { AsyncProfileService } from '../profile_service';
/**
 * Indicates the current solution type (i.e. Observability, Security, Search)
 */
export declare enum SolutionType {
    Observability = "oblt",
    Security = "security",
    Search = "es",
    Default = "default"
}
/**
 * The root profile interface
 */
export type RootProfile = Profile;
/**
 * Parameters for the root profile provider `resolve` method
 */
export interface RootProfileProviderParams {
    /**
     * The current solution navigation ID ('oblt', 'security', 'search', or null)
     */
    solutionNavId?: string | null;
}
/**
 * The resulting context object returned by the root profile provider `resolve` method
 */
export interface RootContext {
    /**
     * The current solution type
     */
    solutionType: SolutionType;
}
export type RootProfileProvider<TProviderContext = {}> = AsyncProfileProvider<RootProfile, RootProfileProviderParams, RootContext & TProviderContext>;
export declare class RootProfileService extends AsyncProfileService<RootProfileProvider> {
    constructor();
}
