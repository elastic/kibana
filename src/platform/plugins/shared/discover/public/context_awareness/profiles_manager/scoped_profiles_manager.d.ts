import { BehaviorSubject } from 'rxjs';
import type { DataTableRecord } from '@kbn/discover-utils';
import type { ContextWithProfileId } from '../profile_service';
import type { DataSourceContext, DataSourceProfileProviderParams, DataSourceProfileService } from '../profiles/data_source_profile';
import type { AppliedProfile } from '../composable_profile';
import type { DocumentContext, DocumentProfileProviderParams, DocumentProfileService } from '../profiles/document_profile';
import type { RootContext } from '../profiles/root_profile';
import type { ScopedDiscoverEBTManager } from '../../ebt_manager';
export interface DataTableRecordWithContext extends DataTableRecord {
    context: ContextWithProfileId<DocumentContext>;
}
/**
 * Options for the `getProfiles` method
 */
export interface GetProfilesOptions {
    /**
     * The data table record to use for the document profile
     */
    record?: DataTableRecord;
}
/**
 * Result returned from data source profile resolution.
 */
export interface ResolveDataSourceProfileResult {
    /**
     * Whether the resolved data source profile differs from the previously active profile.
     */
    didProfileChange: boolean;
    /**
     * Whether it's the first data source profile resolved since the manager was created.
     */
    isFirstResolution: boolean;
}
export declare class ScopedProfilesManager {
    private readonly rootContext$;
    private readonly getRootProfile;
    private readonly dataSourceProfileService;
    private readonly documentProfileService;
    private readonly scopedEbtManager;
    private readonly dataSourceContext$;
    private dataSourceProfile;
    private prevDataSourceProfileParams?;
    private dataSourceProfileAbortController?;
    constructor(rootContext$: BehaviorSubject<ContextWithProfileId<RootContext>>, getRootProfile: () => AppliedProfile, dataSourceProfileService: DataSourceProfileService, documentProfileService: DocumentProfileService, scopedEbtManager: ScopedDiscoverEBTManager);
    /**
     * Resolves the data source context profile
     * @param params The data source profile provider parameters
     * @param onBeforeChange An optional callback to be invoked before changing the context
     */
    resolveDataSourceProfile(params: Omit<DataSourceProfileProviderParams, 'rootContext'>, onBeforeChange?: () => void): Promise<ResolveDataSourceProfileResult>;
    /**
     * Resolves the document context profile for a given data table record
     * @param params The document profile provider parameters
     * @returns The data table record with a resolved document context
     */
    resolveDocumentProfile(params: Omit<DocumentProfileProviderParams, 'rootContext' | 'dataSourceContext'>): DataTableRecord;
    /**
     * Retrieves an array of the resolved profiles
     * @param options Options for getting the profiles
     * @returns The resolved profiles
     */
    getProfiles({ record }?: GetProfilesOptions): AppliedProfile[];
    /**
     * Retrieves an observable of the resolved profiles that emits when the profiles change
     * @param options Options for getting the profiles
     * @returns The resolved profiles as an observable
     */
    getProfiles$(options?: GetProfilesOptions): import("rxjs").Observable<AppliedProfile[]>;
    getContexts(): {
        rootContext: ContextWithProfileId<RootContext>;
        dataSourceContext: ContextWithProfileId<DataSourceContext>;
    };
    /**
     * Tracks the active profiles in the EBT context
     */
    private trackActiveProfiles;
}
