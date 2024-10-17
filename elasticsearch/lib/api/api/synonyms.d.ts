import { Transport, TransportRequestOptions, TransportRequestOptionsWithMeta, TransportRequestOptionsWithOutMeta, TransportResult } from '@elastic/transport';
import * as T from '../types';
import * as TB from '../typesWithBodyKey';
interface That {
    transport: Transport;
}
export default class Synonyms {
    transport: Transport;
    constructor(transport: Transport);
    /**
      * Deletes a synonym set
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/delete-synonyms-set.html | Elasticsearch API documentation}
      */
    deleteSynonym(this: That, params: T.SynonymsDeleteSynonymRequest | TB.SynonymsDeleteSynonymRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.SynonymsDeleteSynonymResponse>;
    deleteSynonym(this: That, params: T.SynonymsDeleteSynonymRequest | TB.SynonymsDeleteSynonymRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.SynonymsDeleteSynonymResponse, unknown>>;
    deleteSynonym(this: That, params: T.SynonymsDeleteSynonymRequest | TB.SynonymsDeleteSynonymRequest, options?: TransportRequestOptions): Promise<T.SynonymsDeleteSynonymResponse>;
    /**
      * Deletes a synonym rule in a synonym set
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/delete-synonym-rule.html | Elasticsearch API documentation}
      */
    deleteSynonymRule(this: That, params: T.SynonymsDeleteSynonymRuleRequest | TB.SynonymsDeleteSynonymRuleRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.SynonymsDeleteSynonymRuleResponse>;
    deleteSynonymRule(this: That, params: T.SynonymsDeleteSynonymRuleRequest | TB.SynonymsDeleteSynonymRuleRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.SynonymsDeleteSynonymRuleResponse, unknown>>;
    deleteSynonymRule(this: That, params: T.SynonymsDeleteSynonymRuleRequest | TB.SynonymsDeleteSynonymRuleRequest, options?: TransportRequestOptions): Promise<T.SynonymsDeleteSynonymRuleResponse>;
    /**
      * Retrieves a synonym set
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/get-synonyms-set.html | Elasticsearch API documentation}
      */
    getSynonym(this: That, params: T.SynonymsGetSynonymRequest | TB.SynonymsGetSynonymRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.SynonymsGetSynonymResponse>;
    getSynonym(this: That, params: T.SynonymsGetSynonymRequest | TB.SynonymsGetSynonymRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.SynonymsGetSynonymResponse, unknown>>;
    getSynonym(this: That, params: T.SynonymsGetSynonymRequest | TB.SynonymsGetSynonymRequest, options?: TransportRequestOptions): Promise<T.SynonymsGetSynonymResponse>;
    /**
      * Retrieves a synonym rule from a synonym set
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/get-synonym-rule.html | Elasticsearch API documentation}
      */
    getSynonymRule(this: That, params: T.SynonymsGetSynonymRuleRequest | TB.SynonymsGetSynonymRuleRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.SynonymsGetSynonymRuleResponse>;
    getSynonymRule(this: That, params: T.SynonymsGetSynonymRuleRequest | TB.SynonymsGetSynonymRuleRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.SynonymsGetSynonymRuleResponse, unknown>>;
    getSynonymRule(this: That, params: T.SynonymsGetSynonymRuleRequest | TB.SynonymsGetSynonymRuleRequest, options?: TransportRequestOptions): Promise<T.SynonymsGetSynonymRuleResponse>;
    /**
      * Retrieves a summary of all defined synonym sets
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/list-synonyms-sets.html | Elasticsearch API documentation}
      */
    getSynonymsSets(this: That, params?: T.SynonymsGetSynonymsSetsRequest | TB.SynonymsGetSynonymsSetsRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.SynonymsGetSynonymsSetsResponse>;
    getSynonymsSets(this: That, params?: T.SynonymsGetSynonymsSetsRequest | TB.SynonymsGetSynonymsSetsRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.SynonymsGetSynonymsSetsResponse, unknown>>;
    getSynonymsSets(this: That, params?: T.SynonymsGetSynonymsSetsRequest | TB.SynonymsGetSynonymsSetsRequest, options?: TransportRequestOptions): Promise<T.SynonymsGetSynonymsSetsResponse>;
    /**
      * Creates or updates a synonym set.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/put-synonyms-set.html | Elasticsearch API documentation}
      */
    putSynonym(this: That, params: T.SynonymsPutSynonymRequest | TB.SynonymsPutSynonymRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.SynonymsPutSynonymResponse>;
    putSynonym(this: That, params: T.SynonymsPutSynonymRequest | TB.SynonymsPutSynonymRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.SynonymsPutSynonymResponse, unknown>>;
    putSynonym(this: That, params: T.SynonymsPutSynonymRequest | TB.SynonymsPutSynonymRequest, options?: TransportRequestOptions): Promise<T.SynonymsPutSynonymResponse>;
    /**
      * Creates or updates a synonym rule in a synonym set
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/put-synonym-rule.html | Elasticsearch API documentation}
      */
    putSynonymRule(this: That, params: T.SynonymsPutSynonymRuleRequest | TB.SynonymsPutSynonymRuleRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.SynonymsPutSynonymRuleResponse>;
    putSynonymRule(this: That, params: T.SynonymsPutSynonymRuleRequest | TB.SynonymsPutSynonymRuleRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.SynonymsPutSynonymRuleResponse, unknown>>;
    putSynonymRule(this: That, params: T.SynonymsPutSynonymRuleRequest | TB.SynonymsPutSynonymRuleRequest, options?: TransportRequestOptions): Promise<T.SynonymsPutSynonymRuleResponse>;
}
export {};
