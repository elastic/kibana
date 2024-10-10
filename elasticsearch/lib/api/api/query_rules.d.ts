import { Transport, TransportRequestOptions, TransportRequestOptionsWithMeta, TransportRequestOptionsWithOutMeta, TransportResult } from '@elastic/transport';
import * as T from '../types';
import * as TB from '../typesWithBodyKey';
interface That {
    transport: Transport;
}
export default class QueryRules {
    transport: Transport;
    constructor(transport: Transport);
    /**
      * Deletes a query rule within a query ruleset.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/delete-query-rule.html | Elasticsearch API documentation}
      */
    deleteRule(this: That, params: T.QueryRulesDeleteRuleRequest | TB.QueryRulesDeleteRuleRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.QueryRulesDeleteRuleResponse>;
    deleteRule(this: That, params: T.QueryRulesDeleteRuleRequest | TB.QueryRulesDeleteRuleRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.QueryRulesDeleteRuleResponse, unknown>>;
    deleteRule(this: That, params: T.QueryRulesDeleteRuleRequest | TB.QueryRulesDeleteRuleRequest, options?: TransportRequestOptions): Promise<T.QueryRulesDeleteRuleResponse>;
    /**
      * Deletes a query ruleset.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/delete-query-ruleset.html | Elasticsearch API documentation}
      */
    deleteRuleset(this: That, params: T.QueryRulesDeleteRulesetRequest | TB.QueryRulesDeleteRulesetRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.QueryRulesDeleteRulesetResponse>;
    deleteRuleset(this: That, params: T.QueryRulesDeleteRulesetRequest | TB.QueryRulesDeleteRulesetRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.QueryRulesDeleteRulesetResponse, unknown>>;
    deleteRuleset(this: That, params: T.QueryRulesDeleteRulesetRequest | TB.QueryRulesDeleteRulesetRequest, options?: TransportRequestOptions): Promise<T.QueryRulesDeleteRulesetResponse>;
    /**
      * Returns the details about a query rule within a query ruleset
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/get-query-rule.html | Elasticsearch API documentation}
      */
    getRule(this: That, params: T.QueryRulesGetRuleRequest | TB.QueryRulesGetRuleRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.QueryRulesGetRuleResponse>;
    getRule(this: That, params: T.QueryRulesGetRuleRequest | TB.QueryRulesGetRuleRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.QueryRulesGetRuleResponse, unknown>>;
    getRule(this: That, params: T.QueryRulesGetRuleRequest | TB.QueryRulesGetRuleRequest, options?: TransportRequestOptions): Promise<T.QueryRulesGetRuleResponse>;
    /**
      * Returns the details about a query ruleset
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/get-query-ruleset.html | Elasticsearch API documentation}
      */
    getRuleset(this: That, params: T.QueryRulesGetRulesetRequest | TB.QueryRulesGetRulesetRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.QueryRulesGetRulesetResponse>;
    getRuleset(this: That, params: T.QueryRulesGetRulesetRequest | TB.QueryRulesGetRulesetRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.QueryRulesGetRulesetResponse, unknown>>;
    getRuleset(this: That, params: T.QueryRulesGetRulesetRequest | TB.QueryRulesGetRulesetRequest, options?: TransportRequestOptions): Promise<T.QueryRulesGetRulesetResponse>;
    /**
      * Returns summarized information about existing query rulesets.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/list-query-rulesets.html | Elasticsearch API documentation}
      */
    listRulesets(this: That, params?: T.QueryRulesListRulesetsRequest | TB.QueryRulesListRulesetsRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.QueryRulesListRulesetsResponse>;
    listRulesets(this: That, params?: T.QueryRulesListRulesetsRequest | TB.QueryRulesListRulesetsRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.QueryRulesListRulesetsResponse, unknown>>;
    listRulesets(this: That, params?: T.QueryRulesListRulesetsRequest | TB.QueryRulesListRulesetsRequest, options?: TransportRequestOptions): Promise<T.QueryRulesListRulesetsResponse>;
    /**
      * Creates or updates a query rule within a query ruleset.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/put-query-rule.html | Elasticsearch API documentation}
      */
    putRule(this: That, params: T.QueryRulesPutRuleRequest | TB.QueryRulesPutRuleRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.QueryRulesPutRuleResponse>;
    putRule(this: That, params: T.QueryRulesPutRuleRequest | TB.QueryRulesPutRuleRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.QueryRulesPutRuleResponse, unknown>>;
    putRule(this: That, params: T.QueryRulesPutRuleRequest | TB.QueryRulesPutRuleRequest, options?: TransportRequestOptions): Promise<T.QueryRulesPutRuleResponse>;
    /**
      * Creates or updates a query ruleset.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/put-query-ruleset.html | Elasticsearch API documentation}
      */
    putRuleset(this: That, params: T.QueryRulesPutRulesetRequest | TB.QueryRulesPutRulesetRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.QueryRulesPutRulesetResponse>;
    putRuleset(this: That, params: T.QueryRulesPutRulesetRequest | TB.QueryRulesPutRulesetRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.QueryRulesPutRulesetResponse, unknown>>;
    putRuleset(this: That, params: T.QueryRulesPutRulesetRequest | TB.QueryRulesPutRulesetRequest, options?: TransportRequestOptions): Promise<T.QueryRulesPutRulesetResponse>;
}
export {};
