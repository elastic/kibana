import { Transport, TransportRequestOptions, TransportRequestOptionsWithMeta, TransportRequestOptionsWithOutMeta, TransportResult } from '@elastic/transport';
import * as T from '../types';
import * as TB from '../typesWithBodyKey';
interface That {
    transport: Transport;
}
export default class Ccr {
    transport: Transport;
    constructor(transport: Transport);
    /**
      * Deletes auto-follow patterns.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/ccr-delete-auto-follow-pattern.html | Elasticsearch API documentation}
      */
    deleteAutoFollowPattern(this: That, params: T.CcrDeleteAutoFollowPatternRequest | TB.CcrDeleteAutoFollowPatternRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.CcrDeleteAutoFollowPatternResponse>;
    deleteAutoFollowPattern(this: That, params: T.CcrDeleteAutoFollowPatternRequest | TB.CcrDeleteAutoFollowPatternRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.CcrDeleteAutoFollowPatternResponse, unknown>>;
    deleteAutoFollowPattern(this: That, params: T.CcrDeleteAutoFollowPatternRequest | TB.CcrDeleteAutoFollowPatternRequest, options?: TransportRequestOptions): Promise<T.CcrDeleteAutoFollowPatternResponse>;
    /**
      * Creates a new follower index configured to follow the referenced leader index.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/ccr-put-follow.html | Elasticsearch API documentation}
      */
    follow(this: That, params: T.CcrFollowRequest | TB.CcrFollowRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.CcrFollowResponse>;
    follow(this: That, params: T.CcrFollowRequest | TB.CcrFollowRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.CcrFollowResponse, unknown>>;
    follow(this: That, params: T.CcrFollowRequest | TB.CcrFollowRequest, options?: TransportRequestOptions): Promise<T.CcrFollowResponse>;
    /**
      * Retrieves information about all follower indices, including parameters and status for each follower index
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/ccr-get-follow-info.html | Elasticsearch API documentation}
      */
    followInfo(this: That, params: T.CcrFollowInfoRequest | TB.CcrFollowInfoRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.CcrFollowInfoResponse>;
    followInfo(this: That, params: T.CcrFollowInfoRequest | TB.CcrFollowInfoRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.CcrFollowInfoResponse, unknown>>;
    followInfo(this: That, params: T.CcrFollowInfoRequest | TB.CcrFollowInfoRequest, options?: TransportRequestOptions): Promise<T.CcrFollowInfoResponse>;
    /**
      * Retrieves follower stats. return shard-level stats about the following tasks associated with each shard for the specified indices.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/ccr-get-follow-stats.html | Elasticsearch API documentation}
      */
    followStats(this: That, params: T.CcrFollowStatsRequest | TB.CcrFollowStatsRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.CcrFollowStatsResponse>;
    followStats(this: That, params: T.CcrFollowStatsRequest | TB.CcrFollowStatsRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.CcrFollowStatsResponse, unknown>>;
    followStats(this: That, params: T.CcrFollowStatsRequest | TB.CcrFollowStatsRequest, options?: TransportRequestOptions): Promise<T.CcrFollowStatsResponse>;
    /**
      * Removes the follower retention leases from the leader.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/ccr-post-forget-follower.html | Elasticsearch API documentation}
      */
    forgetFollower(this: That, params: T.CcrForgetFollowerRequest | TB.CcrForgetFollowerRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.CcrForgetFollowerResponse>;
    forgetFollower(this: That, params: T.CcrForgetFollowerRequest | TB.CcrForgetFollowerRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.CcrForgetFollowerResponse, unknown>>;
    forgetFollower(this: That, params: T.CcrForgetFollowerRequest | TB.CcrForgetFollowerRequest, options?: TransportRequestOptions): Promise<T.CcrForgetFollowerResponse>;
    /**
      * Gets configured auto-follow patterns. Returns the specified auto-follow pattern collection.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/ccr-get-auto-follow-pattern.html | Elasticsearch API documentation}
      */
    getAutoFollowPattern(this: That, params?: T.CcrGetAutoFollowPatternRequest | TB.CcrGetAutoFollowPatternRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.CcrGetAutoFollowPatternResponse>;
    getAutoFollowPattern(this: That, params?: T.CcrGetAutoFollowPatternRequest | TB.CcrGetAutoFollowPatternRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.CcrGetAutoFollowPatternResponse, unknown>>;
    getAutoFollowPattern(this: That, params?: T.CcrGetAutoFollowPatternRequest | TB.CcrGetAutoFollowPatternRequest, options?: TransportRequestOptions): Promise<T.CcrGetAutoFollowPatternResponse>;
    /**
      * Pauses an auto-follow pattern
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/ccr-pause-auto-follow-pattern.html | Elasticsearch API documentation}
      */
    pauseAutoFollowPattern(this: That, params: T.CcrPauseAutoFollowPatternRequest | TB.CcrPauseAutoFollowPatternRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.CcrPauseAutoFollowPatternResponse>;
    pauseAutoFollowPattern(this: That, params: T.CcrPauseAutoFollowPatternRequest | TB.CcrPauseAutoFollowPatternRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.CcrPauseAutoFollowPatternResponse, unknown>>;
    pauseAutoFollowPattern(this: That, params: T.CcrPauseAutoFollowPatternRequest | TB.CcrPauseAutoFollowPatternRequest, options?: TransportRequestOptions): Promise<T.CcrPauseAutoFollowPatternResponse>;
    /**
      * Pauses a follower index. The follower index will not fetch any additional operations from the leader index.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/ccr-post-pause-follow.html | Elasticsearch API documentation}
      */
    pauseFollow(this: That, params: T.CcrPauseFollowRequest | TB.CcrPauseFollowRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.CcrPauseFollowResponse>;
    pauseFollow(this: That, params: T.CcrPauseFollowRequest | TB.CcrPauseFollowRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.CcrPauseFollowResponse, unknown>>;
    pauseFollow(this: That, params: T.CcrPauseFollowRequest | TB.CcrPauseFollowRequest, options?: TransportRequestOptions): Promise<T.CcrPauseFollowResponse>;
    /**
      * Creates a new named collection of auto-follow patterns against a specified remote cluster. Newly created indices on the remote cluster matching any of the specified patterns will be automatically configured as follower indices.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/ccr-put-auto-follow-pattern.html | Elasticsearch API documentation}
      */
    putAutoFollowPattern(this: That, params: T.CcrPutAutoFollowPatternRequest | TB.CcrPutAutoFollowPatternRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.CcrPutAutoFollowPatternResponse>;
    putAutoFollowPattern(this: That, params: T.CcrPutAutoFollowPatternRequest | TB.CcrPutAutoFollowPatternRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.CcrPutAutoFollowPatternResponse, unknown>>;
    putAutoFollowPattern(this: That, params: T.CcrPutAutoFollowPatternRequest | TB.CcrPutAutoFollowPatternRequest, options?: TransportRequestOptions): Promise<T.CcrPutAutoFollowPatternResponse>;
    /**
      * Resumes an auto-follow pattern that has been paused
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/ccr-resume-auto-follow-pattern.html | Elasticsearch API documentation}
      */
    resumeAutoFollowPattern(this: That, params: T.CcrResumeAutoFollowPatternRequest | TB.CcrResumeAutoFollowPatternRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.CcrResumeAutoFollowPatternResponse>;
    resumeAutoFollowPattern(this: That, params: T.CcrResumeAutoFollowPatternRequest | TB.CcrResumeAutoFollowPatternRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.CcrResumeAutoFollowPatternResponse, unknown>>;
    resumeAutoFollowPattern(this: That, params: T.CcrResumeAutoFollowPatternRequest | TB.CcrResumeAutoFollowPatternRequest, options?: TransportRequestOptions): Promise<T.CcrResumeAutoFollowPatternResponse>;
    /**
      * Resumes a follower index that has been paused
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/ccr-post-resume-follow.html | Elasticsearch API documentation}
      */
    resumeFollow(this: That, params: T.CcrResumeFollowRequest | TB.CcrResumeFollowRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.CcrResumeFollowResponse>;
    resumeFollow(this: That, params: T.CcrResumeFollowRequest | TB.CcrResumeFollowRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.CcrResumeFollowResponse, unknown>>;
    resumeFollow(this: That, params: T.CcrResumeFollowRequest | TB.CcrResumeFollowRequest, options?: TransportRequestOptions): Promise<T.CcrResumeFollowResponse>;
    /**
      * Gets all stats related to cross-cluster replication.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/ccr-get-stats.html | Elasticsearch API documentation}
      */
    stats(this: That, params?: T.CcrStatsRequest | TB.CcrStatsRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.CcrStatsResponse>;
    stats(this: That, params?: T.CcrStatsRequest | TB.CcrStatsRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.CcrStatsResponse, unknown>>;
    stats(this: That, params?: T.CcrStatsRequest | TB.CcrStatsRequest, options?: TransportRequestOptions): Promise<T.CcrStatsResponse>;
    /**
      * Stops the following task associated with a follower index and removes index metadata and settings associated with cross-cluster replication.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/ccr-post-unfollow.html | Elasticsearch API documentation}
      */
    unfollow(this: That, params: T.CcrUnfollowRequest | TB.CcrUnfollowRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.CcrUnfollowResponse>;
    unfollow(this: That, params: T.CcrUnfollowRequest | TB.CcrUnfollowRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.CcrUnfollowResponse, unknown>>;
    unfollow(this: That, params: T.CcrUnfollowRequest | TB.CcrUnfollowRequest, options?: TransportRequestOptions): Promise<T.CcrUnfollowResponse>;
}
export {};
