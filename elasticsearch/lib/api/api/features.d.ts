import { Transport, TransportRequestOptions, TransportRequestOptionsWithMeta, TransportRequestOptionsWithOutMeta, TransportResult } from '@elastic/transport';
import * as T from '../types';
import * as TB from '../typesWithBodyKey';
interface That {
    transport: Transport;
}
export default class Features {
    transport: Transport;
    constructor(transport: Transport);
    /**
      * Gets a list of features which can be included in snapshots using the feature_states field when creating a snapshot
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/get-features-api.html | Elasticsearch API documentation}
      */
    getFeatures(this: That, params?: T.FeaturesGetFeaturesRequest | TB.FeaturesGetFeaturesRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.FeaturesGetFeaturesResponse>;
    getFeatures(this: That, params?: T.FeaturesGetFeaturesRequest | TB.FeaturesGetFeaturesRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.FeaturesGetFeaturesResponse, unknown>>;
    getFeatures(this: That, params?: T.FeaturesGetFeaturesRequest | TB.FeaturesGetFeaturesRequest, options?: TransportRequestOptions): Promise<T.FeaturesGetFeaturesResponse>;
    /**
      * Resets the internal state of features, usually by deleting system indices
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/modules-snapshots.html | Elasticsearch API documentation}
      */
    resetFeatures(this: That, params?: T.FeaturesResetFeaturesRequest | TB.FeaturesResetFeaturesRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.FeaturesResetFeaturesResponse>;
    resetFeatures(this: That, params?: T.FeaturesResetFeaturesRequest | TB.FeaturesResetFeaturesRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.FeaturesResetFeaturesResponse, unknown>>;
    resetFeatures(this: That, params?: T.FeaturesResetFeaturesRequest | TB.FeaturesResetFeaturesRequest, options?: TransportRequestOptions): Promise<T.FeaturesResetFeaturesResponse>;
}
export {};
