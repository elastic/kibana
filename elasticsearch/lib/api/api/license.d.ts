import { Transport, TransportRequestOptions, TransportRequestOptionsWithMeta, TransportRequestOptionsWithOutMeta, TransportResult } from '@elastic/transport';
import * as T from '../types';
import * as TB from '../typesWithBodyKey';
interface That {
    transport: Transport;
}
export default class License {
    transport: Transport;
    constructor(transport: Transport);
    /**
      * Deletes licensing information for the cluster
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/delete-license.html | Elasticsearch API documentation}
      */
    delete(this: That, params?: T.LicenseDeleteRequest | TB.LicenseDeleteRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.LicenseDeleteResponse>;
    delete(this: That, params?: T.LicenseDeleteRequest | TB.LicenseDeleteRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.LicenseDeleteResponse, unknown>>;
    delete(this: That, params?: T.LicenseDeleteRequest | TB.LicenseDeleteRequest, options?: TransportRequestOptions): Promise<T.LicenseDeleteResponse>;
    /**
      * This API returns information about the type of license, when it was issued, and when it expires, for example. For more information about the different types of licenses, see https://www.elastic.co/subscriptions.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/get-license.html | Elasticsearch API documentation}
      */
    get(this: That, params?: T.LicenseGetRequest | TB.LicenseGetRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.LicenseGetResponse>;
    get(this: That, params?: T.LicenseGetRequest | TB.LicenseGetRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.LicenseGetResponse, unknown>>;
    get(this: That, params?: T.LicenseGetRequest | TB.LicenseGetRequest, options?: TransportRequestOptions): Promise<T.LicenseGetResponse>;
    /**
      * Retrieves information about the status of the basic license.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/get-basic-status.html | Elasticsearch API documentation}
      */
    getBasicStatus(this: That, params?: T.LicenseGetBasicStatusRequest | TB.LicenseGetBasicStatusRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.LicenseGetBasicStatusResponse>;
    getBasicStatus(this: That, params?: T.LicenseGetBasicStatusRequest | TB.LicenseGetBasicStatusRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.LicenseGetBasicStatusResponse, unknown>>;
    getBasicStatus(this: That, params?: T.LicenseGetBasicStatusRequest | TB.LicenseGetBasicStatusRequest, options?: TransportRequestOptions): Promise<T.LicenseGetBasicStatusResponse>;
    /**
      * Retrieves information about the status of the trial license.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/get-trial-status.html | Elasticsearch API documentation}
      */
    getTrialStatus(this: That, params?: T.LicenseGetTrialStatusRequest | TB.LicenseGetTrialStatusRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.LicenseGetTrialStatusResponse>;
    getTrialStatus(this: That, params?: T.LicenseGetTrialStatusRequest | TB.LicenseGetTrialStatusRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.LicenseGetTrialStatusResponse, unknown>>;
    getTrialStatus(this: That, params?: T.LicenseGetTrialStatusRequest | TB.LicenseGetTrialStatusRequest, options?: TransportRequestOptions): Promise<T.LicenseGetTrialStatusResponse>;
    /**
      * Updates the license for the cluster.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/update-license.html | Elasticsearch API documentation}
      */
    post(this: That, params?: T.LicensePostRequest | TB.LicensePostRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.LicensePostResponse>;
    post(this: That, params?: T.LicensePostRequest | TB.LicensePostRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.LicensePostResponse, unknown>>;
    post(this: That, params?: T.LicensePostRequest | TB.LicensePostRequest, options?: TransportRequestOptions): Promise<T.LicensePostResponse>;
    /**
      * The start basic API enables you to initiate an indefinite basic license, which gives access to all the basic features. If the basic license does not support all of the features that are available with your current license, however, you are notified in the response. You must then re-submit the API request with the acknowledge parameter set to true. To check the status of your basic license, use the following API: [Get basic status](https://www.elastic.co/guide/en/elasticsearch/reference/current/get-basic-status.html).
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/start-basic.html | Elasticsearch API documentation}
      */
    postStartBasic(this: That, params?: T.LicensePostStartBasicRequest | TB.LicensePostStartBasicRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.LicensePostStartBasicResponse>;
    postStartBasic(this: That, params?: T.LicensePostStartBasicRequest | TB.LicensePostStartBasicRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.LicensePostStartBasicResponse, unknown>>;
    postStartBasic(this: That, params?: T.LicensePostStartBasicRequest | TB.LicensePostStartBasicRequest, options?: TransportRequestOptions): Promise<T.LicensePostStartBasicResponse>;
    /**
      * The start trial API enables you to start a 30-day trial, which gives access to all subscription features.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/start-trial.html | Elasticsearch API documentation}
      */
    postStartTrial(this: That, params?: T.LicensePostStartTrialRequest | TB.LicensePostStartTrialRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.LicensePostStartTrialResponse>;
    postStartTrial(this: That, params?: T.LicensePostStartTrialRequest | TB.LicensePostStartTrialRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.LicensePostStartTrialResponse, unknown>>;
    postStartTrial(this: That, params?: T.LicensePostStartTrialRequest | TB.LicensePostStartTrialRequest, options?: TransportRequestOptions): Promise<T.LicensePostStartTrialResponse>;
}
export {};
