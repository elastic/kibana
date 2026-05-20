import type { ProfileProviderServices } from '../profile_provider_services';
export declare const createObservabilityDocumentProfileProviders: (providerServices: ProfileProviderServices) => (import("../..").DocumentProfileProvider | import("./log_document_profile/profile").LogDocumentProfileProvider)[];
