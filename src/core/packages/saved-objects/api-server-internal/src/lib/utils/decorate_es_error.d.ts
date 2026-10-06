import { errors as esErrors } from '@elastic/elasticsearch';
type EsErrors = esErrors.ConnectionError | esErrors.NoLivingConnectionsError | esErrors.TimeoutError | esErrors.ResponseError;
export declare function decorateEsError(error: EsErrors): import("@kbn/core-saved-objects-server").DecoratedError;
export {};
