import {
  IEsSearchRequest,
  IEsSearchResponse,
  IKibanaSearchRequest,
  IKibanaSearchResponse,
} from '../../data/common';

export interface IMyStrategyRequest extends IEsSearchRequest {
  get_cool: boolean;
}
export interface IMyStrategyResponse extends IEsSearchResponse {
  cool: string;
  executed_at: number;
}
