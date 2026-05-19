import type { RootProfileService, DataSourceProfileService, DocumentProfileService, RootProfileProviderParams } from '../profiles';
import type { ScopedDiscoverEBTManager } from '../../ebt_manager';
import type { AppliedProfile } from '../composable_profile';
import { ScopedProfilesManager } from './scoped_profiles_manager';
/**
 * Result of resolving the root profile
 */
export interface ResolveRootProfileResult {
    /**
     * Default ad hoc data views accessor
     */
    getDefaultAdHocDataViews: AppliedProfile['getDefaultAdHocDataViews'];
    /**
     * Default ES|QL query accessor
     */
    getDefaultEsqlQuery: AppliedProfile['getDefaultEsqlQuery'];
}
export declare class ProfilesManager {
    private readonly rootProfileService;
    private readonly dataSourceProfileService;
    private readonly documentProfileService;
    private rootProfile;
    private prevRootProfileParams?;
    private rootProfileAbortController?;
    private readonly rootContext$;
    constructor(rootProfileService: RootProfileService, dataSourceProfileService: DataSourceProfileService, documentProfileService: DocumentProfileService);
    /**
     * Resolves the root context profile
     * @param params The root profile provider parameters
     */
    resolveRootProfile(params: RootProfileProviderParams): Promise<ResolveRootProfileResult>;
    /**
     * Creates a profiles manager instance scoped to a single tab with a shared root context
     * @returns The scoped profiles manager
     */
    createScopedProfilesManager({ scopedEbtManager, }: {
        scopedEbtManager: ScopedDiscoverEBTManager;
    }): ScopedProfilesManager;
}
