import type { ConnectionRequestParams } from '@elastic/transport';
import type { SanitizedConnectionRequestParams } from '@kbn/search-types';
export declare function sanitizeRequestParams(requestParams: ConnectionRequestParams): SanitizedConnectionRequestParams;
