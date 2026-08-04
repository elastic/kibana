import type { ConnectionRequestParams } from '@elastic/transport';
import type { TransportResult } from '@elastic/elasticsearch';
import type { EqlSearchResponse } from './types';
import type { EqlSearchStrategyResponse } from '../../../../common';
/**
 * Get the Kibana representation of an EQL search response (see `IKibanaSearchResponse`).
 * (EQL does not provide _shard info, so total/loaded cannot be calculated.)
 */
export declare function toEqlKibanaSearchResponse(response: TransportResult<EqlSearchResponse>, requestParams?: ConnectionRequestParams): EqlSearchStrategyResponse;
