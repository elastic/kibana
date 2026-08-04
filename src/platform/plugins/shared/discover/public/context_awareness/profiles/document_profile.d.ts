import type { DataTableRecord } from '@kbn/discover-utils';
import type { Profile } from '../types';
import type { ContextWithProfileId, ProfileProvider } from '../profile_service';
import { ProfileService } from '../profile_service';
import type { RootContext } from './root_profile';
import type { DataSourceContext } from './data_source_profile';
/**
 * Indicates the current document type (e.g. log, alert, etc.)
 */
export declare enum DocumentType {
    Log = "log",
    Trace = "trace",
    Generic = "generic",
    Default = "default"
}
/**
 * The document profile interface
 */
export type DocumentProfile = Pick<Profile, 'getDocViewer'>;
/**
 * Parameters for the document profile provider `resolve` method
 */
export interface DocumentProfileProviderParams {
    /**
     * The current root context
     */
    rootContext: ContextWithProfileId<RootContext>;
    /**
     * The current data source context
     */
    dataSourceContext: ContextWithProfileId<DataSourceContext>;
    /**
     * The current data table record
     */
    record: DataTableRecord;
}
/**
 * The resulting context object returned by the document profile provider `resolve` method
 */
export interface DocumentContext {
    /**
     * The current document type
     */
    type: DocumentType;
}
export type DocumentProfileProvider<TProviderContext = {}> = ProfileProvider<DocumentProfile, DocumentProfileProviderParams, DocumentContext & TProviderContext>;
export declare class DocumentProfileService extends ProfileService<DocumentProfileProvider> {
    constructor();
}
