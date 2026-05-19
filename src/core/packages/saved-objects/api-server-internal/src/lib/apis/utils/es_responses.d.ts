import type { estypes } from '@elastic/elasticsearch';
/**
 * Type and type guard function for converting a possibly not existent doc to an existent doc.
 */
export type GetResponseFound<TDocument = unknown> = estypes.GetResponse<TDocument> & Required<Pick<estypes.GetResponse<TDocument>, '_primary_term' | '_seq_no' | '_version' | '_source'>>;
export declare const isFoundGetResponse: <TDocument = unknown>(doc: estypes.GetResponse<TDocument>) => doc is GetResponseFound<TDocument>;
