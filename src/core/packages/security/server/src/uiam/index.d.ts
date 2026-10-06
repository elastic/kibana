export { isUiamCredential, isUiamBearerCredential } from './utils';
export { isMissingApiKey, isRevokedApiKey } from './errors';
export { UIAM_INTERNAL_CALLER_ATTESTATION_HEADER, ES_CLIENT_AUTHENTICATION_HEADER, deriveInternalCallerAttestation, } from './attestation';
export type { UiamProjectType } from './project_type';
export { markExternalUiamCredential, isExternalUiamCredential } from './external_credential';
