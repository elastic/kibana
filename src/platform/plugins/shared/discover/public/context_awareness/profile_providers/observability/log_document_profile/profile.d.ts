import { BehaviorSubject } from 'rxjs';
import type { DocumentProfileProvider } from '../../../profiles';
import type { ProfileProviderServices } from '../../profile_provider_services';
import type { LogOverviewContext } from '../logs_data_source_profile/profile';
export type LogDocumentProfileProvider = DocumentProfileProvider<{
    logOverviewContext$: BehaviorSubject<LogOverviewContext | undefined>;
}>;
export declare const OBSERVABILITY_LOG_DOCUMENT_PROFILE_ID = "observability-log-document-profile";
export declare const createObservabilityLogDocumentProfileProvider: (services: ProfileProviderServices) => LogDocumentProfileProvider;
