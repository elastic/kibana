/*
 * Copyright Elasticsearch B.V. and contributors
 * SPDX-License-Identifier: Apache-2.0
 */

/*
 * AUTO-GENERATED from src/es/apis/*.ts via scripts/build-api-manifest.mjs.
 * DO NOT EDIT BY HAND. Regenerate after running the code generator.
 */

/** Cheap metadata for every Elasticsearch API command. No Zod schemas loaded. */
export interface EsApiMeta {
  readonly name: string
  readonly namespace: string | null
  readonly description: string
  readonly method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'HEAD'
  readonly path: string
  readonly responseType?: 'json' | 'text'
  readonly bodyFormat?: 'json' | 'ndjson'
  /** File stem under src/es/apis/ that holds the full EsApiDefinition. */
  readonly namespaceFile: string
}

export const apiManifest: readonly EsApiMeta[] = [
  {
    "name": "delete",
    "namespace": "async-search",
    "description": "Delete an async search.",
    "method": "DELETE",
    "path": "/_async_search/{id}",
    "namespaceFile": "async_search_delete"
  },
  {
    "name": "get",
    "namespace": "async-search",
    "description": "Get async search results.",
    "method": "GET",
    "path": "/_async_search/{id}",
    "namespaceFile": "async_search_get"
  },
  {
    "name": "status",
    "namespace": "async-search",
    "description": "Get the async search status.",
    "method": "GET",
    "path": "/_async_search/status/{id}",
    "namespaceFile": "async_search_status"
  },
  {
    "name": "submit",
    "namespace": "async-search",
    "description": "Run an async search.",
    "method": "POST",
    "path": "/{index}/_async_search",
    "namespaceFile": "async_search_submit"
  },
  {
    "name": "bulk",
    "namespace": null,
    "description": "Bulk index or delete documents.",
    "method": "POST",
    "path": "/{index}/_bulk",
    "namespaceFile": "bulk",
    "bodyFormat": "ndjson"
  },
  {
    "name": "aliases",
    "namespace": "cat",
    "description": "Get aliases.",
    "method": "GET",
    "path": "/_cat/aliases/{name}",
    "namespaceFile": "cat_aliases",
    "responseType": "text"
  },
  {
    "name": "allocation",
    "namespace": "cat",
    "description": "Get shard allocation information.",
    "method": "GET",
    "path": "/_cat/allocation/{node_id}",
    "namespaceFile": "cat_allocation",
    "responseType": "text"
  },
  {
    "name": "circuit-breaker",
    "namespace": "cat",
    "description": "Get circuit breakers statistics.",
    "method": "GET",
    "path": "/_cat/circuit_breaker/{circuit_breaker_patterns}",
    "namespaceFile": "cat_circuit_breaker",
    "responseType": "text"
  },
  {
    "name": "component-templates",
    "namespace": "cat",
    "description": "Get component templates.",
    "method": "GET",
    "path": "/_cat/component_templates/{name}",
    "namespaceFile": "cat_component_templates",
    "responseType": "text"
  },
  {
    "name": "count",
    "namespace": "cat",
    "description": "Get a document count.",
    "method": "POST",
    "path": "/_cat/count/{index}",
    "namespaceFile": "cat_count",
    "responseType": "text"
  },
  {
    "name": "fielddata",
    "namespace": "cat",
    "description": "Get field data cache information.",
    "method": "GET",
    "path": "/_cat/fielddata/{fields}",
    "namespaceFile": "cat_fielddata",
    "responseType": "text"
  },
  {
    "name": "health",
    "namespace": "cat",
    "description": "Get the cluster health status.",
    "method": "GET",
    "path": "/_cat/health",
    "namespaceFile": "cat_health",
    "responseType": "text"
  },
  {
    "name": "help",
    "namespace": "cat",
    "description": "Get CAT help.",
    "method": "GET",
    "path": "/_cat",
    "namespaceFile": "cat_help",
    "responseType": "text"
  },
  {
    "name": "indices",
    "namespace": "cat",
    "description": "Get index information.",
    "method": "GET",
    "path": "/_cat/indices/{index}",
    "namespaceFile": "cat_indices",
    "responseType": "text"
  },
  {
    "name": "master",
    "namespace": "cat",
    "description": "Get master node information.",
    "method": "GET",
    "path": "/_cat/master",
    "namespaceFile": "cat_master",
    "responseType": "text"
  },
  {
    "name": "ml-data-frame-analytics",
    "namespace": "cat",
    "description": "Get data frame analytics jobs.",
    "method": "GET",
    "path": "/_cat/ml/data_frame/analytics/{id}",
    "namespaceFile": "cat_ml_data_frame_analytics",
    "responseType": "text"
  },
  {
    "name": "ml-datafeeds",
    "namespace": "cat",
    "description": "Get datafeeds.",
    "method": "GET",
    "path": "/_cat/ml/datafeeds/{datafeed_id}",
    "namespaceFile": "cat_ml_datafeeds",
    "responseType": "text"
  },
  {
    "name": "ml-jobs",
    "namespace": "cat",
    "description": "Get anomaly detection jobs.",
    "method": "GET",
    "path": "/_cat/ml/anomaly_detectors/{job_id}",
    "namespaceFile": "cat_ml_jobs",
    "responseType": "text"
  },
  {
    "name": "ml-trained-models",
    "namespace": "cat",
    "description": "Get trained models.",
    "method": "GET",
    "path": "/_cat/ml/trained_models/{model_id}",
    "namespaceFile": "cat_ml_trained_models",
    "responseType": "text"
  },
  {
    "name": "nodeattrs",
    "namespace": "cat",
    "description": "Get node attribute information.",
    "method": "GET",
    "path": "/_cat/nodeattrs",
    "namespaceFile": "cat_nodeattrs",
    "responseType": "text"
  },
  {
    "name": "nodes",
    "namespace": "cat",
    "description": "Get node information.",
    "method": "GET",
    "path": "/_cat/nodes",
    "namespaceFile": "cat_nodes",
    "responseType": "text"
  },
  {
    "name": "pending-tasks",
    "namespace": "cat",
    "description": "Get pending task information.",
    "method": "GET",
    "path": "/_cat/pending_tasks",
    "namespaceFile": "cat_pending_tasks",
    "responseType": "text"
  },
  {
    "name": "plugins",
    "namespace": "cat",
    "description": "Get plugin information.",
    "method": "GET",
    "path": "/_cat/plugins",
    "namespaceFile": "cat_plugins",
    "responseType": "text"
  },
  {
    "name": "recovery",
    "namespace": "cat",
    "description": "Get shard recovery information.",
    "method": "GET",
    "path": "/_cat/recovery/{index}",
    "namespaceFile": "cat_recovery",
    "responseType": "text"
  },
  {
    "name": "repositories",
    "namespace": "cat",
    "description": "Get snapshot repository information.",
    "method": "GET",
    "path": "/_cat/repositories",
    "namespaceFile": "cat_repositories",
    "responseType": "text"
  },
  {
    "name": "segments",
    "namespace": "cat",
    "description": "Get segment information.",
    "method": "GET",
    "path": "/_cat/segments/{index}",
    "namespaceFile": "cat_segments",
    "responseType": "text"
  },
  {
    "name": "shards",
    "namespace": "cat",
    "description": "Get shard information.",
    "method": "GET",
    "path": "/_cat/shards/{index}",
    "namespaceFile": "cat_shards",
    "responseType": "text"
  },
  {
    "name": "snapshots",
    "namespace": "cat",
    "description": "Get snapshot information.",
    "method": "GET",
    "path": "/_cat/snapshots/{repository}",
    "namespaceFile": "cat_snapshots",
    "responseType": "text"
  },
  {
    "name": "tasks",
    "namespace": "cat",
    "description": "Get task information.",
    "method": "GET",
    "path": "/_cat/tasks",
    "namespaceFile": "cat_tasks",
    "responseType": "text"
  },
  {
    "name": "templates",
    "namespace": "cat",
    "description": "Get index template information.",
    "method": "GET",
    "path": "/_cat/templates/{name}",
    "namespaceFile": "cat_templates",
    "responseType": "text"
  },
  {
    "name": "thread-pool",
    "namespace": "cat",
    "description": "Get thread pool statistics.",
    "method": "GET",
    "path": "/_cat/thread_pool/{thread_pool_patterns}",
    "namespaceFile": "cat_thread_pool",
    "responseType": "text"
  },
  {
    "name": "transforms",
    "namespace": "cat",
    "description": "Get transform information.",
    "method": "GET",
    "path": "/_cat/transforms/{transform_id}",
    "namespaceFile": "cat_transforms",
    "responseType": "text"
  },
  {
    "name": "delete-auto-follow-pattern",
    "namespace": "ccr",
    "description": "Delete auto-follow patterns.",
    "method": "DELETE",
    "path": "/_ccr/auto_follow/{name}",
    "namespaceFile": "ccr_delete_auto_follow_pattern"
  },
  {
    "name": "follow",
    "namespace": "ccr",
    "description": "Create a follower.",
    "method": "PUT",
    "path": "/{index}/_ccr/follow",
    "namespaceFile": "ccr_follow"
  },
  {
    "name": "follow-info",
    "namespace": "ccr",
    "description": "Get follower information.",
    "method": "GET",
    "path": "/{index}/_ccr/info",
    "namespaceFile": "ccr_follow_info"
  },
  {
    "name": "follow-stats",
    "namespace": "ccr",
    "description": "Get follower stats.",
    "method": "GET",
    "path": "/{index}/_ccr/stats",
    "namespaceFile": "ccr_follow_stats"
  },
  {
    "name": "forget-follower",
    "namespace": "ccr",
    "description": "Forget a follower.",
    "method": "POST",
    "path": "/{index}/_ccr/forget_follower",
    "namespaceFile": "ccr_forget_follower"
  },
  {
    "name": "get-auto-follow-pattern",
    "namespace": "ccr",
    "description": "Get auto-follow patterns.",
    "method": "GET",
    "path": "/_ccr/auto_follow/{name}",
    "namespaceFile": "ccr_get_auto_follow_pattern"
  },
  {
    "name": "pause-auto-follow-pattern",
    "namespace": "ccr",
    "description": "Pause an auto-follow pattern.",
    "method": "POST",
    "path": "/_ccr/auto_follow/{name}/pause",
    "namespaceFile": "ccr_pause_auto_follow_pattern"
  },
  {
    "name": "pause-follow",
    "namespace": "ccr",
    "description": "Pause a follower.",
    "method": "POST",
    "path": "/{index}/_ccr/pause_follow",
    "namespaceFile": "ccr_pause_follow"
  },
  {
    "name": "put-auto-follow-pattern",
    "namespace": "ccr",
    "description": "Create or update auto-follow patterns.",
    "method": "PUT",
    "path": "/_ccr/auto_follow/{name}",
    "namespaceFile": "ccr_put_auto_follow_pattern"
  },
  {
    "name": "resume-auto-follow-pattern",
    "namespace": "ccr",
    "description": "Resume an auto-follow pattern.",
    "method": "POST",
    "path": "/_ccr/auto_follow/{name}/resume",
    "namespaceFile": "ccr_resume_auto_follow_pattern"
  },
  {
    "name": "resume-follow",
    "namespace": "ccr",
    "description": "Resume a follower.",
    "method": "POST",
    "path": "/{index}/_ccr/resume_follow",
    "namespaceFile": "ccr_resume_follow"
  },
  {
    "name": "stats",
    "namespace": "ccr",
    "description": "Get cross-cluster replication stats.",
    "method": "GET",
    "path": "/_ccr/stats",
    "namespaceFile": "ccr_stats"
  },
  {
    "name": "unfollow",
    "namespace": "ccr",
    "description": "Unfollow an index.",
    "method": "POST",
    "path": "/{index}/_ccr/unfollow",
    "namespaceFile": "ccr_unfollow"
  },
  {
    "name": "clear-scroll",
    "namespace": null,
    "description": "Clear a scrolling search.",
    "method": "DELETE",
    "path": "/_search/scroll",
    "namespaceFile": "clear_scroll"
  },
  {
    "name": "close-point-in-time",
    "namespace": null,
    "description": "Close a point in time.",
    "method": "DELETE",
    "path": "/_pit",
    "namespaceFile": "close_point_in_time"
  },
  {
    "name": "allocation-explain",
    "namespace": "cluster",
    "description": "Explain the shard allocations.",
    "method": "GET",
    "path": "/_cluster/allocation/explain",
    "namespaceFile": "cluster_allocation_explain"
  },
  {
    "name": "delete-component-template",
    "namespace": "cluster",
    "description": "Delete component templates.",
    "method": "DELETE",
    "path": "/_component_template/{name}",
    "namespaceFile": "cluster_delete_component_template"
  },
  {
    "name": "delete-voting-config-exclusions",
    "namespace": "cluster",
    "description": "Clear cluster voting config exclusions.",
    "method": "DELETE",
    "path": "/_cluster/voting_config_exclusions",
    "namespaceFile": "cluster_delete_voting_config_exclusions"
  },
  {
    "name": "exists-component-template",
    "namespace": "cluster",
    "description": "Check component templates.",
    "method": "HEAD",
    "path": "/_component_template/{name}",
    "namespaceFile": "cluster_exists_component_template"
  },
  {
    "name": "get-component-template",
    "namespace": "cluster",
    "description": "Get component templates.",
    "method": "GET",
    "path": "/_component_template/{name}",
    "namespaceFile": "cluster_get_component_template"
  },
  {
    "name": "get-settings",
    "namespace": "cluster",
    "description": "Get cluster-wide settings.",
    "method": "GET",
    "path": "/_cluster/settings",
    "namespaceFile": "cluster_get_settings"
  },
  {
    "name": "health",
    "namespace": "cluster",
    "description": "Get the cluster health status.",
    "method": "GET",
    "path": "/_cluster/health/{index}",
    "namespaceFile": "cluster_health"
  },
  {
    "name": "info",
    "namespace": "cluster",
    "description": "Get cluster info.",
    "method": "GET",
    "path": "/_info/{target}",
    "namespaceFile": "cluster_info"
  },
  {
    "name": "pending-tasks",
    "namespace": "cluster",
    "description": "Get the pending cluster tasks.",
    "method": "GET",
    "path": "/_cluster/pending_tasks",
    "namespaceFile": "cluster_pending_tasks"
  },
  {
    "name": "post-voting-config-exclusions",
    "namespace": "cluster",
    "description": "Update voting configuration exclusions.",
    "method": "POST",
    "path": "/_cluster/voting_config_exclusions",
    "namespaceFile": "cluster_post_voting_config_exclusions"
  },
  {
    "name": "put-component-template",
    "namespace": "cluster",
    "description": "Create or update a component template.",
    "method": "PUT",
    "path": "/_component_template/{name}",
    "namespaceFile": "cluster_put_component_template"
  },
  {
    "name": "put-settings",
    "namespace": "cluster",
    "description": "Update the cluster settings.",
    "method": "PUT",
    "path": "/_cluster/settings",
    "namespaceFile": "cluster_put_settings"
  },
  {
    "name": "remote-info",
    "namespace": "cluster",
    "description": "Get remote cluster information.",
    "method": "GET",
    "path": "/_remote/info",
    "namespaceFile": "cluster_remote_info"
  },
  {
    "name": "reroute",
    "namespace": "cluster",
    "description": "Reroute the cluster.",
    "method": "POST",
    "path": "/_cluster/reroute",
    "namespaceFile": "cluster_reroute"
  },
  {
    "name": "state",
    "namespace": "cluster",
    "description": "Get the cluster state.",
    "method": "GET",
    "path": "/_cluster/state/{metric}/{index}",
    "namespaceFile": "cluster_state"
  },
  {
    "name": "stats",
    "namespace": "cluster",
    "description": "Get cluster statistics.",
    "method": "GET",
    "path": "/_cluster/stats",
    "namespaceFile": "cluster_stats"
  },
  {
    "name": "check-in",
    "namespace": "connector",
    "description": "Check in a connector.",
    "method": "PUT",
    "path": "/_connector/{connector_id}/_check_in",
    "namespaceFile": "connector_check_in"
  },
  {
    "name": "delete",
    "namespace": "connector",
    "description": "Delete a connector.",
    "method": "DELETE",
    "path": "/_connector/{connector_id}",
    "namespaceFile": "connector_delete"
  },
  {
    "name": "get",
    "namespace": "connector",
    "description": "Get a connector.",
    "method": "GET",
    "path": "/_connector/{connector_id}",
    "namespaceFile": "connector_get"
  },
  {
    "name": "list",
    "namespace": "connector",
    "description": "Get all connectors.",
    "method": "GET",
    "path": "/_connector",
    "namespaceFile": "connector_list"
  },
  {
    "name": "post",
    "namespace": "connector",
    "description": "Create a connector.",
    "method": "POST",
    "path": "/_connector",
    "namespaceFile": "connector_post"
  },
  {
    "name": "put",
    "namespace": "connector",
    "description": "Create or update a connector.",
    "method": "PUT",
    "path": "/_connector/{connector_id}",
    "namespaceFile": "connector_put"
  },
  {
    "name": "sync-job-cancel",
    "namespace": "connector",
    "description": "Cancel a connector sync job.",
    "method": "PUT",
    "path": "/_connector/_sync_job/{connector_sync_job_id}/_cancel",
    "namespaceFile": "connector_sync_job_cancel"
  },
  {
    "name": "sync-job-check-in",
    "namespace": "connector",
    "description": "Check in a connector sync job.",
    "method": "PUT",
    "path": "/_connector/_sync_job/{connector_sync_job_id}/_check_in",
    "namespaceFile": "connector_sync_job_check_in"
  },
  {
    "name": "sync-job-claim",
    "namespace": "connector",
    "description": "Claim a connector sync job.",
    "method": "PUT",
    "path": "/_connector/_sync_job/{connector_sync_job_id}/_claim",
    "namespaceFile": "connector_sync_job_claim"
  },
  {
    "name": "sync-job-delete",
    "namespace": "connector",
    "description": "Delete a connector sync job.",
    "method": "DELETE",
    "path": "/_connector/_sync_job/{connector_sync_job_id}",
    "namespaceFile": "connector_sync_job_delete"
  },
  {
    "name": "sync-job-error",
    "namespace": "connector",
    "description": "Set a connector sync job error.",
    "method": "PUT",
    "path": "/_connector/_sync_job/{connector_sync_job_id}/_error",
    "namespaceFile": "connector_sync_job_error"
  },
  {
    "name": "sync-job-get",
    "namespace": "connector",
    "description": "Get a connector sync job.",
    "method": "GET",
    "path": "/_connector/_sync_job/{connector_sync_job_id}",
    "namespaceFile": "connector_sync_job_get"
  },
  {
    "name": "sync-job-list",
    "namespace": "connector",
    "description": "Get all connector sync jobs.",
    "method": "GET",
    "path": "/_connector/_sync_job",
    "namespaceFile": "connector_sync_job_list"
  },
  {
    "name": "sync-job-post",
    "namespace": "connector",
    "description": "Create a connector sync job.",
    "method": "POST",
    "path": "/_connector/_sync_job",
    "namespaceFile": "connector_sync_job_post"
  },
  {
    "name": "sync-job-update-stats",
    "namespace": "connector",
    "description": "Set the connector sync job stats.",
    "method": "PUT",
    "path": "/_connector/_sync_job/{connector_sync_job_id}/_stats",
    "namespaceFile": "connector_sync_job_update_stats"
  },
  {
    "name": "update-active-filtering",
    "namespace": "connector",
    "description": "Activate the connector draft filter.",
    "method": "PUT",
    "path": "/_connector/{connector_id}/_filtering/_activate",
    "namespaceFile": "connector_update_active_filtering"
  },
  {
    "name": "update-api-key-id",
    "namespace": "connector",
    "description": "Update the connector API key ID.",
    "method": "PUT",
    "path": "/_connector/{connector_id}/_api_key_id",
    "namespaceFile": "connector_update_api_key_id"
  },
  {
    "name": "update-configuration",
    "namespace": "connector",
    "description": "Update the connector configuration.",
    "method": "PUT",
    "path": "/_connector/{connector_id}/_configuration",
    "namespaceFile": "connector_update_configuration"
  },
  {
    "name": "update-error",
    "namespace": "connector",
    "description": "Update the connector error field.",
    "method": "PUT",
    "path": "/_connector/{connector_id}/_error",
    "namespaceFile": "connector_update_error"
  },
  {
    "name": "update-features",
    "namespace": "connector",
    "description": "Update the connector features.",
    "method": "PUT",
    "path": "/_connector/{connector_id}/_features",
    "namespaceFile": "connector_update_features"
  },
  {
    "name": "update-filtering",
    "namespace": "connector",
    "description": "Update the connector filtering.",
    "method": "PUT",
    "path": "/_connector/{connector_id}/_filtering",
    "namespaceFile": "connector_update_filtering"
  },
  {
    "name": "update-filtering-validation",
    "namespace": "connector",
    "description": "Update the connector draft filtering validation.",
    "method": "PUT",
    "path": "/_connector/{connector_id}/_filtering/_validation",
    "namespaceFile": "connector_update_filtering_validation"
  },
  {
    "name": "update-index-name",
    "namespace": "connector",
    "description": "Update the connector index name.",
    "method": "PUT",
    "path": "/_connector/{connector_id}/_index_name",
    "namespaceFile": "connector_update_index_name"
  },
  {
    "name": "update-name",
    "namespace": "connector",
    "description": "Update the connector name and description.",
    "method": "PUT",
    "path": "/_connector/{connector_id}/_name",
    "namespaceFile": "connector_update_name"
  },
  {
    "name": "update-native",
    "namespace": "connector",
    "description": "Update the connector is_native flag.",
    "method": "PUT",
    "path": "/_connector/{connector_id}/_native",
    "namespaceFile": "connector_update_native"
  },
  {
    "name": "update-pipeline",
    "namespace": "connector",
    "description": "Update the connector pipeline.",
    "method": "PUT",
    "path": "/_connector/{connector_id}/_pipeline",
    "namespaceFile": "connector_update_pipeline"
  },
  {
    "name": "update-scheduling",
    "namespace": "connector",
    "description": "Update the connector scheduling.",
    "method": "PUT",
    "path": "/_connector/{connector_id}/_scheduling",
    "namespaceFile": "connector_update_scheduling"
  },
  {
    "name": "update-service-type",
    "namespace": "connector",
    "description": "Update the connector service type.",
    "method": "PUT",
    "path": "/_connector/{connector_id}/_service_type",
    "namespaceFile": "connector_update_service_type"
  },
  {
    "name": "update-status",
    "namespace": "connector",
    "description": "Update the connector status.",
    "method": "PUT",
    "path": "/_connector/{connector_id}/_status",
    "namespaceFile": "connector_update_status"
  },
  {
    "name": "count",
    "namespace": null,
    "description": "Count search results.",
    "method": "POST",
    "path": "/{index}/_count",
    "namespaceFile": "count"
  },
  {
    "name": "create",
    "namespace": null,
    "description": "Create a new document in the index.",
    "method": "PUT",
    "path": "/{index}/_create/{id}",
    "namespaceFile": "create"
  },
  {
    "name": "delete-dangling-index",
    "namespace": "dangling-indices",
    "description": "Delete a dangling index.",
    "method": "DELETE",
    "path": "/_dangling/{index_uuid}",
    "namespaceFile": "dangling_indices_delete_dangling_index"
  },
  {
    "name": "import-dangling-index",
    "namespace": "dangling-indices",
    "description": "Import a dangling index.",
    "method": "POST",
    "path": "/_dangling/{index_uuid}",
    "namespaceFile": "dangling_indices_import_dangling_index"
  },
  {
    "name": "list-dangling-indices",
    "namespace": "dangling-indices",
    "description": "Get the dangling indices.",
    "method": "GET",
    "path": "/_dangling",
    "namespaceFile": "dangling_indices_list_dangling_indices"
  },
  {
    "name": "delete",
    "namespace": null,
    "description": "Delete a document.",
    "method": "DELETE",
    "path": "/{index}/_doc/{id}",
    "namespaceFile": "delete"
  },
  {
    "name": "delete-by-query",
    "namespace": null,
    "description": "Delete documents.",
    "method": "POST",
    "path": "/{index}/_delete_by_query",
    "namespaceFile": "delete_by_query"
  },
  {
    "name": "delete-by-query-rethrottle",
    "namespace": null,
    "description": "Throttle a delete by query operation.",
    "method": "POST",
    "path": "/_delete_by_query/{task_id}/_rethrottle",
    "namespaceFile": "delete_by_query_rethrottle"
  },
  {
    "name": "delete-script",
    "namespace": null,
    "description": "Delete a script or search template.",
    "method": "DELETE",
    "path": "/_scripts/{id}",
    "namespaceFile": "delete_script"
  },
  {
    "name": "delete-policy",
    "namespace": "enrich",
    "description": "Delete an enrich policy.",
    "method": "DELETE",
    "path": "/_enrich/policy/{name}",
    "namespaceFile": "enrich_delete_policy"
  },
  {
    "name": "execute-policy",
    "namespace": "enrich",
    "description": "Run an enrich policy.",
    "method": "PUT",
    "path": "/_enrich/policy/{name}/_execute",
    "namespaceFile": "enrich_execute_policy"
  },
  {
    "name": "get-policy",
    "namespace": "enrich",
    "description": "Get an enrich policy.",
    "method": "GET",
    "path": "/_enrich/policy/{name}",
    "namespaceFile": "enrich_get_policy"
  },
  {
    "name": "put-policy",
    "namespace": "enrich",
    "description": "Create an enrich policy.",
    "method": "PUT",
    "path": "/_enrich/policy/{name}",
    "namespaceFile": "enrich_put_policy"
  },
  {
    "name": "stats",
    "namespace": "enrich",
    "description": "Get enrich stats.",
    "method": "GET",
    "path": "/_enrich/_stats",
    "namespaceFile": "enrich_stats"
  },
  {
    "name": "delete",
    "namespace": "eql",
    "description": "Delete an async EQL search.",
    "method": "DELETE",
    "path": "/_eql/search/{id}",
    "namespaceFile": "eql_delete"
  },
  {
    "name": "get",
    "namespace": "eql",
    "description": "Get async EQL search results.",
    "method": "GET",
    "path": "/_eql/search/{id}",
    "namespaceFile": "eql_get"
  },
  {
    "name": "get-status",
    "namespace": "eql",
    "description": "Get the async EQL status.",
    "method": "GET",
    "path": "/_eql/search/status/{id}",
    "namespaceFile": "eql_get_status"
  },
  {
    "name": "search",
    "namespace": "eql",
    "description": "Get EQL search results.",
    "method": "GET",
    "path": "/{index}/_eql/search",
    "namespaceFile": "eql_search"
  },
  {
    "name": "async-query",
    "namespace": "esql",
    "description": "Run an async ES|QL query.",
    "method": "POST",
    "path": "/_query/async",
    "namespaceFile": "esql_async_query"
  },
  {
    "name": "async-query-delete",
    "namespace": "esql",
    "description": "Delete an async ES|QL query.",
    "method": "DELETE",
    "path": "/_query/async/{id}",
    "namespaceFile": "esql_async_query_delete"
  },
  {
    "name": "async-query-get",
    "namespace": "esql",
    "description": "Get async ES|QL query results.",
    "method": "GET",
    "path": "/_query/async/{id}",
    "namespaceFile": "esql_async_query_get"
  },
  {
    "name": "async-query-stop",
    "namespace": "esql",
    "description": "Stop async ES|QL query.",
    "method": "POST",
    "path": "/_query/async/{id}/stop",
    "namespaceFile": "esql_async_query_stop"
  },
  {
    "name": "delete-view",
    "namespace": "esql",
    "description": "Delete an ES|QL view.",
    "method": "DELETE",
    "path": "/_query/view/{name}",
    "namespaceFile": "esql_delete_view"
  },
  {
    "name": "get-query",
    "namespace": "esql",
    "description": "Get a specific running ES|QL query information.",
    "method": "GET",
    "path": "/_query/queries/{id}",
    "namespaceFile": "esql_get_query"
  },
  {
    "name": "get-view",
    "namespace": "esql",
    "description": "Get an ES|QL view.",
    "method": "GET",
    "path": "/_query/view/{name}",
    "namespaceFile": "esql_get_view"
  },
  {
    "name": "list-queries",
    "namespace": "esql",
    "description": "Get running ES|QL queries information.",
    "method": "GET",
    "path": "/_query/queries",
    "namespaceFile": "esql_list_queries"
  },
  {
    "name": "put-view",
    "namespace": "esql",
    "description": "Create or update an ES|QL view.",
    "method": "PUT",
    "path": "/_query/view/{name}",
    "namespaceFile": "esql_put_view"
  },
  {
    "name": "query",
    "namespace": "esql",
    "description": "Run an ES|QL query.",
    "method": "POST",
    "path": "/_query",
    "namespaceFile": "esql_query"
  },
  {
    "name": "exists",
    "namespace": null,
    "description": "Check a document.",
    "method": "HEAD",
    "path": "/{index}/_doc/{id}",
    "namespaceFile": "exists"
  },
  {
    "name": "exists-source",
    "namespace": null,
    "description": "Check for a document source.",
    "method": "HEAD",
    "path": "/{index}/_source/{id}",
    "namespaceFile": "exists_source"
  },
  {
    "name": "explain",
    "namespace": null,
    "description": "Explain a document match result.",
    "method": "GET",
    "path": "/{index}/_explain/{id}",
    "namespaceFile": "explain"
  },
  {
    "name": "get-features",
    "namespace": "features",
    "description": "Get the features.",
    "method": "GET",
    "path": "/_features",
    "namespaceFile": "features_get_features"
  },
  {
    "name": "reset-features",
    "namespace": "features",
    "description": "Reset the features.",
    "method": "POST",
    "path": "/_features/_reset",
    "namespaceFile": "features_reset_features"
  },
  {
    "name": "field-caps",
    "namespace": null,
    "description": "Get the field capabilities.",
    "method": "GET",
    "path": "/{index}/_field_caps",
    "namespaceFile": "field_caps"
  },
  {
    "name": "global-checkpoints",
    "namespace": "fleet",
    "description": "Get global checkpoints.",
    "method": "GET",
    "path": "/{index}/_fleet/global_checkpoints",
    "namespaceFile": "fleet_global_checkpoints"
  },
  {
    "name": "msearch",
    "namespace": "fleet",
    "description": "Run multiple Fleet searches.",
    "method": "GET",
    "path": "/{index}/_fleet/_fleet_msearch",
    "namespaceFile": "fleet_msearch",
    "bodyFormat": "ndjson"
  },
  {
    "name": "search",
    "namespace": "fleet",
    "description": "Run a Fleet search.",
    "method": "GET",
    "path": "/{index}/_fleet/_fleet_search",
    "namespaceFile": "fleet_search"
  },
  {
    "name": "get",
    "namespace": null,
    "description": "Get a document by its ID.",
    "method": "GET",
    "path": "/{index}/_doc/{id}",
    "namespaceFile": "get"
  },
  {
    "name": "get-script",
    "namespace": null,
    "description": "Get a script or search template.",
    "method": "GET",
    "path": "/_scripts/{id}",
    "namespaceFile": "get_script"
  },
  {
    "name": "get-script-context",
    "namespace": null,
    "description": "Get script contexts.",
    "method": "GET",
    "path": "/_script_context",
    "namespaceFile": "get_script_context"
  },
  {
    "name": "get-script-languages",
    "namespace": null,
    "description": "Get script languages.",
    "method": "GET",
    "path": "/_script_language",
    "namespaceFile": "get_script_languages"
  },
  {
    "name": "get-source",
    "namespace": null,
    "description": "Get a document's source.",
    "method": "GET",
    "path": "/{index}/_source/{id}",
    "namespaceFile": "get_source"
  },
  {
    "name": "explore",
    "namespace": "graph",
    "description": "Explore graph analytics.",
    "method": "GET",
    "path": "/{index}/_graph/explore",
    "namespaceFile": "graph_explore"
  },
  {
    "name": "health-report",
    "namespace": null,
    "description": "Get the cluster health.",
    "method": "GET",
    "path": "/_health_report/{feature}",
    "namespaceFile": "health_report"
  },
  {
    "name": "delete-lifecycle",
    "namespace": "ilm",
    "description": "Delete a lifecycle policy.",
    "method": "DELETE",
    "path": "/_ilm/policy/{policy}",
    "namespaceFile": "ilm_delete_lifecycle"
  },
  {
    "name": "explain-lifecycle",
    "namespace": "ilm",
    "description": "Explain the lifecycle state.",
    "method": "GET",
    "path": "/{index}/_ilm/explain",
    "namespaceFile": "ilm_explain_lifecycle"
  },
  {
    "name": "get-lifecycle",
    "namespace": "ilm",
    "description": "Get lifecycle policies.",
    "method": "GET",
    "path": "/_ilm/policy/{policy}",
    "namespaceFile": "ilm_get_lifecycle"
  },
  {
    "name": "get-status",
    "namespace": "ilm",
    "description": "Get the ILM status.",
    "method": "GET",
    "path": "/_ilm/status",
    "namespaceFile": "ilm_get_status"
  },
  {
    "name": "migrate-to-data-tiers",
    "namespace": "ilm",
    "description": "Migrate to data tiers routing.",
    "method": "POST",
    "path": "/_ilm/migrate_to_data_tiers",
    "namespaceFile": "ilm_migrate_to_data_tiers"
  },
  {
    "name": "move-to-step",
    "namespace": "ilm",
    "description": "Move to a lifecycle step.",
    "method": "POST",
    "path": "/_ilm/move/{index}",
    "namespaceFile": "ilm_move_to_step"
  },
  {
    "name": "put-lifecycle",
    "namespace": "ilm",
    "description": "Create or update a lifecycle policy.",
    "method": "PUT",
    "path": "/_ilm/policy/{policy}",
    "namespaceFile": "ilm_put_lifecycle"
  },
  {
    "name": "remove-policy",
    "namespace": "ilm",
    "description": "Remove policies from an index.",
    "method": "POST",
    "path": "/{index}/_ilm/remove",
    "namespaceFile": "ilm_remove_policy"
  },
  {
    "name": "retry",
    "namespace": "ilm",
    "description": "Retry a policy.",
    "method": "POST",
    "path": "/{index}/_ilm/retry",
    "namespaceFile": "ilm_retry"
  },
  {
    "name": "start",
    "namespace": "ilm",
    "description": "Start the ILM plugin.",
    "method": "POST",
    "path": "/_ilm/start",
    "namespaceFile": "ilm_start"
  },
  {
    "name": "stop",
    "namespace": "ilm",
    "description": "Stop the ILM plugin.",
    "method": "POST",
    "path": "/_ilm/stop",
    "namespaceFile": "ilm_stop"
  },
  {
    "name": "index",
    "namespace": null,
    "description": "Create or update a document in an index.",
    "method": "PUT",
    "path": "/{index}/_doc/{id}",
    "namespaceFile": "index"
  },
  {
    "name": "add-block",
    "namespace": "indices",
    "description": "Add an index block.",
    "method": "PUT",
    "path": "/{index}/_block/{block}",
    "namespaceFile": "indices_add_block"
  },
  {
    "name": "analyze",
    "namespace": "indices",
    "description": "Get tokens from text analysis.",
    "method": "GET",
    "path": "/{index}/_analyze",
    "namespaceFile": "indices_analyze"
  },
  {
    "name": "cancel-migrate-reindex",
    "namespace": "indices",
    "description": "Cancel a migration reindex operation.",
    "method": "POST",
    "path": "/_migration/reindex/{index}/_cancel",
    "namespaceFile": "indices_cancel_migrate_reindex"
  },
  {
    "name": "clear-cache",
    "namespace": "indices",
    "description": "Clear the cache.",
    "method": "POST",
    "path": "/{index}/_cache/clear",
    "namespaceFile": "indices_clear_cache"
  },
  {
    "name": "clone",
    "namespace": "indices",
    "description": "Clone an index.",
    "method": "PUT",
    "path": "/{index}/_clone/{target}",
    "namespaceFile": "indices_clone"
  },
  {
    "name": "close",
    "namespace": "indices",
    "description": "Close an index.",
    "method": "POST",
    "path": "/{index}/_close",
    "namespaceFile": "indices_close"
  },
  {
    "name": "create",
    "namespace": "indices",
    "description": "Create an index.",
    "method": "PUT",
    "path": "/{index}",
    "namespaceFile": "indices_create"
  },
  {
    "name": "create-data-stream",
    "namespace": "indices",
    "description": "Create a data stream.",
    "method": "PUT",
    "path": "/_data_stream/{name}",
    "namespaceFile": "indices_create_data_stream"
  },
  {
    "name": "create-from",
    "namespace": "indices",
    "description": "Create an index from a source index.",
    "method": "PUT",
    "path": "/_create_from/{source}/{dest}",
    "namespaceFile": "indices_create_from"
  },
  {
    "name": "data-streams-stats",
    "namespace": "indices",
    "description": "Get data stream stats.",
    "method": "GET",
    "path": "/_data_stream/{name}/_stats",
    "namespaceFile": "indices_data_streams_stats"
  },
  {
    "name": "delete",
    "namespace": "indices",
    "description": "Delete indices.",
    "method": "DELETE",
    "path": "/{index}",
    "namespaceFile": "indices_delete"
  },
  {
    "name": "delete-alias",
    "namespace": "indices",
    "description": "Delete an alias.",
    "method": "DELETE",
    "path": "/{index}/_aliases/{name}",
    "namespaceFile": "indices_delete_alias"
  },
  {
    "name": "delete-data-lifecycle",
    "namespace": "indices",
    "description": "Delete data stream lifecycles.",
    "method": "DELETE",
    "path": "/_data_stream/{name}/_lifecycle",
    "namespaceFile": "indices_delete_data_lifecycle"
  },
  {
    "name": "delete-data-stream",
    "namespace": "indices",
    "description": "Delete data streams.",
    "method": "DELETE",
    "path": "/_data_stream/{name}",
    "namespaceFile": "indices_delete_data_stream"
  },
  {
    "name": "delete-data-stream-options",
    "namespace": "indices",
    "description": "Delete data stream options.",
    "method": "DELETE",
    "path": "/_data_stream/{name}/_options",
    "namespaceFile": "indices_delete_data_stream_options"
  },
  {
    "name": "delete-index-template",
    "namespace": "indices",
    "description": "Delete an index template.",
    "method": "DELETE",
    "path": "/_index_template/{name}",
    "namespaceFile": "indices_delete_index_template"
  },
  {
    "name": "delete-template",
    "namespace": "indices",
    "description": "Delete a legacy index template.",
    "method": "DELETE",
    "path": "/_template/{name}",
    "namespaceFile": "indices_delete_template"
  },
  {
    "name": "disk-usage",
    "namespace": "indices",
    "description": "Analyze the index disk usage.",
    "method": "POST",
    "path": "/{index}/_disk_usage",
    "namespaceFile": "indices_disk_usage"
  },
  {
    "name": "downsample",
    "namespace": "indices",
    "description": "Downsample an index.",
    "method": "POST",
    "path": "/{index}/_downsample/{target_index}",
    "namespaceFile": "indices_downsample"
  },
  {
    "name": "exists",
    "namespace": "indices",
    "description": "Check indices.",
    "method": "HEAD",
    "path": "/{index}",
    "namespaceFile": "indices_exists"
  },
  {
    "name": "exists-alias",
    "namespace": "indices",
    "description": "Check aliases.",
    "method": "HEAD",
    "path": "/{index}/_alias/{name}",
    "namespaceFile": "indices_exists_alias"
  },
  {
    "name": "exists-index-template",
    "namespace": "indices",
    "description": "Check index templates.",
    "method": "HEAD",
    "path": "/_index_template/{name}",
    "namespaceFile": "indices_exists_index_template"
  },
  {
    "name": "exists-template",
    "namespace": "indices",
    "description": "Check existence of index templates.",
    "method": "HEAD",
    "path": "/_template/{name}",
    "namespaceFile": "indices_exists_template"
  },
  {
    "name": "explain-data-lifecycle",
    "namespace": "indices",
    "description": "Get the status for a data stream lifecycle.",
    "method": "GET",
    "path": "/{index}/_lifecycle/explain",
    "namespaceFile": "indices_explain_data_lifecycle"
  },
  {
    "name": "field-usage-stats",
    "namespace": "indices",
    "description": "Get field usage stats.",
    "method": "GET",
    "path": "/{index}/_field_usage_stats",
    "namespaceFile": "indices_field_usage_stats"
  },
  {
    "name": "flush",
    "namespace": "indices",
    "description": "Flush data streams or indices.",
    "method": "POST",
    "path": "/{index}/_flush",
    "namespaceFile": "indices_flush"
  },
  {
    "name": "forcemerge",
    "namespace": "indices",
    "description": "Force a merge.",
    "method": "POST",
    "path": "/{index}/_forcemerge",
    "namespaceFile": "indices_forcemerge"
  },
  {
    "name": "get",
    "namespace": "indices",
    "description": "Get index information.",
    "method": "GET",
    "path": "/{index}",
    "namespaceFile": "indices_get"
  },
  {
    "name": "get-alias",
    "namespace": "indices",
    "description": "Get aliases.",
    "method": "GET",
    "path": "/{index}/_alias/{name}",
    "namespaceFile": "indices_get_alias"
  },
  {
    "name": "get-data-lifecycle",
    "namespace": "indices",
    "description": "Get data stream lifecycles.",
    "method": "GET",
    "path": "/_data_stream/{name}/_lifecycle",
    "namespaceFile": "indices_get_data_lifecycle"
  },
  {
    "name": "get-data-lifecycle-stats",
    "namespace": "indices",
    "description": "Get data stream lifecycle stats.",
    "method": "GET",
    "path": "/_lifecycle/stats",
    "namespaceFile": "indices_get_data_lifecycle_stats"
  },
  {
    "name": "get-data-stream",
    "namespace": "indices",
    "description": "Get data streams.",
    "method": "GET",
    "path": "/_data_stream/{name}",
    "namespaceFile": "indices_get_data_stream"
  },
  {
    "name": "get-data-stream-mappings",
    "namespace": "indices",
    "description": "Get data stream mappings.",
    "method": "GET",
    "path": "/_data_stream/{name}/_mappings",
    "namespaceFile": "indices_get_data_stream_mappings"
  },
  {
    "name": "get-data-stream-options",
    "namespace": "indices",
    "description": "Get data stream options.",
    "method": "GET",
    "path": "/_data_stream/{name}/_options",
    "namespaceFile": "indices_get_data_stream_options"
  },
  {
    "name": "get-data-stream-settings",
    "namespace": "indices",
    "description": "Get data stream settings.",
    "method": "GET",
    "path": "/_data_stream/{name}/_settings",
    "namespaceFile": "indices_get_data_stream_settings"
  },
  {
    "name": "get-field-mapping",
    "namespace": "indices",
    "description": "Get mapping definitions.",
    "method": "GET",
    "path": "/{index}/_mapping/field/{fields}",
    "namespaceFile": "indices_get_field_mapping"
  },
  {
    "name": "get-index-template",
    "namespace": "indices",
    "description": "Get index templates.",
    "method": "GET",
    "path": "/_index_template/{name}",
    "namespaceFile": "indices_get_index_template"
  },
  {
    "name": "get-mapping",
    "namespace": "indices",
    "description": "Get mapping definitions.",
    "method": "GET",
    "path": "/{index}/_mapping",
    "namespaceFile": "indices_get_mapping"
  },
  {
    "name": "get-migrate-reindex-status",
    "namespace": "indices",
    "description": "Get the migration reindexing status.",
    "method": "GET",
    "path": "/_migration/reindex/{index}/_status",
    "namespaceFile": "indices_get_migrate_reindex_status"
  },
  {
    "name": "get-settings",
    "namespace": "indices",
    "description": "Get index settings.",
    "method": "GET",
    "path": "/{index}/_settings/{name}",
    "namespaceFile": "indices_get_settings"
  },
  {
    "name": "get-template",
    "namespace": "indices",
    "description": "Get legacy index templates.",
    "method": "GET",
    "path": "/_template/{name}",
    "namespaceFile": "indices_get_template"
  },
  {
    "name": "migrate-reindex",
    "namespace": "indices",
    "description": "Reindex legacy backing indices.",
    "method": "POST",
    "path": "/_migration/reindex",
    "namespaceFile": "indices_migrate_reindex"
  },
  {
    "name": "migrate-to-data-stream",
    "namespace": "indices",
    "description": "Convert an index alias to a data stream.",
    "method": "POST",
    "path": "/_data_stream/_migrate/{name}",
    "namespaceFile": "indices_migrate_to_data_stream"
  },
  {
    "name": "modify-data-stream",
    "namespace": "indices",
    "description": "Update data streams.",
    "method": "POST",
    "path": "/_data_stream/_modify",
    "namespaceFile": "indices_modify_data_stream"
  },
  {
    "name": "open",
    "namespace": "indices",
    "description": "Open a closed index.",
    "method": "POST",
    "path": "/{index}/_open",
    "namespaceFile": "indices_open"
  },
  {
    "name": "promote-data-stream",
    "namespace": "indices",
    "description": "Promote a data stream.",
    "method": "POST",
    "path": "/_data_stream/_promote/{name}",
    "namespaceFile": "indices_promote_data_stream"
  },
  {
    "name": "put-alias",
    "namespace": "indices",
    "description": "Create or update an alias.",
    "method": "PUT",
    "path": "/{index}/_aliases/{name}",
    "namespaceFile": "indices_put_alias"
  },
  {
    "name": "put-data-lifecycle",
    "namespace": "indices",
    "description": "Update data stream lifecycles.",
    "method": "PUT",
    "path": "/_data_stream/{name}/_lifecycle",
    "namespaceFile": "indices_put_data_lifecycle"
  },
  {
    "name": "put-data-stream-mappings",
    "namespace": "indices",
    "description": "Update data stream mappings.",
    "method": "PUT",
    "path": "/_data_stream/{name}/_mappings",
    "namespaceFile": "indices_put_data_stream_mappings"
  },
  {
    "name": "put-data-stream-options",
    "namespace": "indices",
    "description": "Update data stream options.",
    "method": "PUT",
    "path": "/_data_stream/{name}/_options",
    "namespaceFile": "indices_put_data_stream_options"
  },
  {
    "name": "put-data-stream-settings",
    "namespace": "indices",
    "description": "Update data stream settings.",
    "method": "PUT",
    "path": "/_data_stream/{name}/_settings",
    "namespaceFile": "indices_put_data_stream_settings"
  },
  {
    "name": "put-index-template",
    "namespace": "indices",
    "description": "Create or update an index template.",
    "method": "PUT",
    "path": "/_index_template/{name}",
    "namespaceFile": "indices_put_index_template"
  },
  {
    "name": "put-mapping",
    "namespace": "indices",
    "description": "Update field mappings.",
    "method": "PUT",
    "path": "/{index}/_mapping",
    "namespaceFile": "indices_put_mapping"
  },
  {
    "name": "put-settings",
    "namespace": "indices",
    "description": "Update index settings.",
    "method": "PUT",
    "path": "/{index}/_settings",
    "namespaceFile": "indices_put_settings"
  },
  {
    "name": "put-template",
    "namespace": "indices",
    "description": "Create or update a legacy index template.",
    "method": "PUT",
    "path": "/_template/{name}",
    "namespaceFile": "indices_put_template"
  },
  {
    "name": "recovery",
    "namespace": "indices",
    "description": "Get index recovery information.",
    "method": "GET",
    "path": "/{index}/_recovery",
    "namespaceFile": "indices_recovery"
  },
  {
    "name": "refresh",
    "namespace": "indices",
    "description": "Refresh an index.",
    "method": "POST",
    "path": "/{index}/_refresh",
    "namespaceFile": "indices_refresh"
  },
  {
    "name": "reload-search-analyzers",
    "namespace": "indices",
    "description": "Reload search analyzers.",
    "method": "GET",
    "path": "/{index}/_reload_search_analyzers",
    "namespaceFile": "indices_reload_search_analyzers"
  },
  {
    "name": "remove-block",
    "namespace": "indices",
    "description": "Remove an index block.",
    "method": "DELETE",
    "path": "/{index}/_block/{block}",
    "namespaceFile": "indices_remove_block"
  },
  {
    "name": "resolve-cluster",
    "namespace": "indices",
    "description": "Resolve the cluster.",
    "method": "GET",
    "path": "/_resolve/cluster/{name}",
    "namespaceFile": "indices_resolve_cluster"
  },
  {
    "name": "resolve-index",
    "namespace": "indices",
    "description": "Resolve indices.",
    "method": "GET",
    "path": "/_resolve/index/{name}",
    "namespaceFile": "indices_resolve_index"
  },
  {
    "name": "rollover",
    "namespace": "indices",
    "description": "Roll over to a new index.",
    "method": "POST",
    "path": "/{alias}/_rollover/{new_index}",
    "namespaceFile": "indices_rollover"
  },
  {
    "name": "segments",
    "namespace": "indices",
    "description": "Get index segments.",
    "method": "GET",
    "path": "/{index}/_segments",
    "namespaceFile": "indices_segments"
  },
  {
    "name": "shard-stores",
    "namespace": "indices",
    "description": "Get index shard stores.",
    "method": "GET",
    "path": "/{index}/_shard_stores",
    "namespaceFile": "indices_shard_stores"
  },
  {
    "name": "shrink",
    "namespace": "indices",
    "description": "Shrink an index.",
    "method": "PUT",
    "path": "/{index}/_shrink/{target}",
    "namespaceFile": "indices_shrink"
  },
  {
    "name": "simulate-index-template",
    "namespace": "indices",
    "description": "Simulate an index.",
    "method": "POST",
    "path": "/_index_template/_simulate_index/{name}",
    "namespaceFile": "indices_simulate_index_template"
  },
  {
    "name": "simulate-template",
    "namespace": "indices",
    "description": "Simulate an index template.",
    "method": "POST",
    "path": "/_index_template/_simulate/{name}",
    "namespaceFile": "indices_simulate_template"
  },
  {
    "name": "split",
    "namespace": "indices",
    "description": "Split an index.",
    "method": "PUT",
    "path": "/{index}/_split/{target}",
    "namespaceFile": "indices_split"
  },
  {
    "name": "stats",
    "namespace": "indices",
    "description": "Get index statistics.",
    "method": "GET",
    "path": "/{index}/_stats/{metric}",
    "namespaceFile": "indices_stats"
  },
  {
    "name": "update-aliases",
    "namespace": "indices",
    "description": "Create or update an alias.",
    "method": "POST",
    "path": "/_aliases",
    "namespaceFile": "indices_update_aliases"
  },
  {
    "name": "validate-query",
    "namespace": "indices",
    "description": "Validate a query.",
    "method": "GET",
    "path": "/{index}/_validate/query",
    "namespaceFile": "indices_validate_query"
  },
  {
    "name": "chat-completion-unified",
    "namespace": "inference",
    "description": "Perform chat completion inference on the service.",
    "method": "POST",
    "path": "/_inference/chat_completion/{inference_id}/_stream",
    "namespaceFile": "inference_chat_completion_unified"
  },
  {
    "name": "completion",
    "namespace": "inference",
    "description": "Perform completion inference on the service.",
    "method": "POST",
    "path": "/_inference/completion/{inference_id}",
    "namespaceFile": "inference_completion"
  },
  {
    "name": "delete",
    "namespace": "inference",
    "description": "Delete an inference endpoint.",
    "method": "DELETE",
    "path": "/_inference/{task_type}/{inference_id}",
    "namespaceFile": "inference_delete"
  },
  {
    "name": "embedding",
    "namespace": "inference",
    "description": "Perform dense embedding inference on the service.",
    "method": "POST",
    "path": "/_inference/embedding/{inference_id}",
    "namespaceFile": "inference_embedding"
  },
  {
    "name": "get",
    "namespace": "inference",
    "description": "Get an inference endpoint.",
    "method": "GET",
    "path": "/_inference/{task_type}/{inference_id}",
    "namespaceFile": "inference_get"
  },
  {
    "name": "inference",
    "namespace": "inference",
    "description": "Perform inference on the service.",
    "method": "POST",
    "path": "/_inference/{task_type}/{inference_id}",
    "namespaceFile": "inference_inference"
  },
  {
    "name": "put",
    "namespace": "inference",
    "description": "Create an inference endpoint.",
    "method": "PUT",
    "path": "/_inference/{task_type}/{inference_id}",
    "namespaceFile": "inference_put"
  },
  {
    "name": "put-ai21",
    "namespace": "inference",
    "description": "Create a AI21 inference endpoint.",
    "method": "PUT",
    "path": "/_inference/{task_type}/{ai21_inference_id}",
    "namespaceFile": "inference_put_ai21"
  },
  {
    "name": "put-alibabacloud",
    "namespace": "inference",
    "description": "Create an AlibabaCloud AI Search inference endpoint.",
    "method": "PUT",
    "path": "/_inference/{task_type}/{alibabacloud_inference_id}",
    "namespaceFile": "inference_put_alibabacloud"
  },
  {
    "name": "put-amazonbedrock",
    "namespace": "inference",
    "description": "Create an Amazon Bedrock inference endpoint.",
    "method": "PUT",
    "path": "/_inference/{task_type}/{amazonbedrock_inference_id}",
    "namespaceFile": "inference_put_amazonbedrock"
  },
  {
    "name": "put-amazonsagemaker",
    "namespace": "inference",
    "description": "Create an Amazon SageMaker inference endpoint.",
    "method": "PUT",
    "path": "/_inference/{task_type}/{amazonsagemaker_inference_id}",
    "namespaceFile": "inference_put_amazonsagemaker"
  },
  {
    "name": "put-anthropic",
    "namespace": "inference",
    "description": "Create an Anthropic inference endpoint.",
    "method": "PUT",
    "path": "/_inference/{task_type}/{anthropic_inference_id}",
    "namespaceFile": "inference_put_anthropic"
  },
  {
    "name": "put-azureaistudio",
    "namespace": "inference",
    "description": "Create an Azure AI studio inference endpoint.",
    "method": "PUT",
    "path": "/_inference/{task_type}/{azureaistudio_inference_id}",
    "namespaceFile": "inference_put_azureaistudio"
  },
  {
    "name": "put-azureopenai",
    "namespace": "inference",
    "description": "Create an Azure OpenAI inference endpoint.",
    "method": "PUT",
    "path": "/_inference/{task_type}/{azureopenai_inference_id}",
    "namespaceFile": "inference_put_azureopenai"
  },
  {
    "name": "put-cohere",
    "namespace": "inference",
    "description": "Create a Cohere inference endpoint.",
    "method": "PUT",
    "path": "/_inference/{task_type}/{cohere_inference_id}",
    "namespaceFile": "inference_put_cohere"
  },
  {
    "name": "put-contextualai",
    "namespace": "inference",
    "description": "Create an Contextual AI inference endpoint.",
    "method": "PUT",
    "path": "/_inference/{task_type}/{contextualai_inference_id}",
    "namespaceFile": "inference_put_contextualai"
  },
  {
    "name": "put-custom",
    "namespace": "inference",
    "description": "Create a custom inference endpoint.",
    "method": "PUT",
    "path": "/_inference/{task_type}/{custom_inference_id}",
    "namespaceFile": "inference_put_custom"
  },
  {
    "name": "put-deepseek",
    "namespace": "inference",
    "description": "Create a DeepSeek inference endpoint.",
    "method": "PUT",
    "path": "/_inference/{task_type}/{deepseek_inference_id}",
    "namespaceFile": "inference_put_deepseek"
  },
  {
    "name": "put-elasticsearch",
    "namespace": "inference",
    "description": "Create an Elasticsearch inference endpoint.",
    "method": "PUT",
    "path": "/_inference/{task_type}/{elasticsearch_inference_id}",
    "namespaceFile": "inference_put_elasticsearch"
  },
  {
    "name": "put-elser",
    "namespace": "inference",
    "description": "Create an ELSER inference endpoint.",
    "method": "PUT",
    "path": "/_inference/{task_type}/{elser_inference_id}",
    "namespaceFile": "inference_put_elser"
  },
  {
    "name": "put-fireworksai",
    "namespace": "inference",
    "description": "Create a Fireworks AI inference endpoint.",
    "method": "PUT",
    "path": "/_inference/{task_type}/{fireworksai_inference_id}",
    "namespaceFile": "inference_put_fireworksai"
  },
  {
    "name": "put-googleaistudio",
    "namespace": "inference",
    "description": "Create an Google AI Studio inference endpoint.",
    "method": "PUT",
    "path": "/_inference/{task_type}/{googleaistudio_inference_id}",
    "namespaceFile": "inference_put_googleaistudio"
  },
  {
    "name": "put-googlevertexai",
    "namespace": "inference",
    "description": "Create a Google Vertex AI inference endpoint.",
    "method": "PUT",
    "path": "/_inference/{task_type}/{googlevertexai_inference_id}",
    "namespaceFile": "inference_put_googlevertexai"
  },
  {
    "name": "put-groq",
    "namespace": "inference",
    "description": "Create a Groq inference endpoint.",
    "method": "PUT",
    "path": "/_inference/{task_type}/{groq_inference_id}",
    "namespaceFile": "inference_put_groq"
  },
  {
    "name": "put-hugging-face",
    "namespace": "inference",
    "description": "Create a Hugging Face inference endpoint.",
    "method": "PUT",
    "path": "/_inference/{task_type}/{huggingface_inference_id}",
    "namespaceFile": "inference_put_hugging_face"
  },
  {
    "name": "put-jinaai",
    "namespace": "inference",
    "description": "Create an JinaAI inference endpoint.",
    "method": "PUT",
    "path": "/_inference/{task_type}/{jinaai_inference_id}",
    "namespaceFile": "inference_put_jinaai"
  },
  {
    "name": "put-llama",
    "namespace": "inference",
    "description": "Create a Llama inference endpoint.",
    "method": "PUT",
    "path": "/_inference/{task_type}/{llama_inference_id}",
    "namespaceFile": "inference_put_llama"
  },
  {
    "name": "put-mistral",
    "namespace": "inference",
    "description": "Create a Mistral inference endpoint.",
    "method": "PUT",
    "path": "/_inference/{task_type}/{mistral_inference_id}",
    "namespaceFile": "inference_put_mistral"
  },
  {
    "name": "put-nvidia",
    "namespace": "inference",
    "description": "Create an Nvidia inference endpoint.",
    "method": "PUT",
    "path": "/_inference/{task_type}/{nvidia_inference_id}",
    "namespaceFile": "inference_put_nvidia"
  },
  {
    "name": "put-openai",
    "namespace": "inference",
    "description": "Create an OpenAI inference endpoint.",
    "method": "PUT",
    "path": "/_inference/{task_type}/{openai_inference_id}",
    "namespaceFile": "inference_put_openai"
  },
  {
    "name": "put-openshift-ai",
    "namespace": "inference",
    "description": "Create an OpenShift AI inference endpoint.",
    "method": "PUT",
    "path": "/_inference/{task_type}/{openshiftai_inference_id}",
    "namespaceFile": "inference_put_openshift_ai"
  },
  {
    "name": "put-voyageai",
    "namespace": "inference",
    "description": "Create a VoyageAI inference endpoint.",
    "method": "PUT",
    "path": "/_inference/{task_type}/{voyageai_inference_id}",
    "namespaceFile": "inference_put_voyageai"
  },
  {
    "name": "put-watsonx",
    "namespace": "inference",
    "description": "Create a Watsonx inference endpoint.",
    "method": "PUT",
    "path": "/_inference/{task_type}/{watsonx_inference_id}",
    "namespaceFile": "inference_put_watsonx"
  },
  {
    "name": "rerank",
    "namespace": "inference",
    "description": "Perform reranking inference on the service.",
    "method": "POST",
    "path": "/_inference/rerank/{inference_id}",
    "namespaceFile": "inference_rerank"
  },
  {
    "name": "sparse-embedding",
    "namespace": "inference",
    "description": "Perform sparse embedding inference on the service.",
    "method": "POST",
    "path": "/_inference/sparse_embedding/{inference_id}",
    "namespaceFile": "inference_sparse_embedding"
  },
  {
    "name": "stream-completion",
    "namespace": "inference",
    "description": "Perform streaming completion inference on the service.",
    "method": "POST",
    "path": "/_inference/completion/{inference_id}/_stream",
    "namespaceFile": "inference_stream_completion"
  },
  {
    "name": "text-embedding",
    "namespace": "inference",
    "description": "Perform text embedding inference on the service.",
    "method": "POST",
    "path": "/_inference/text_embedding/{inference_id}",
    "namespaceFile": "inference_text_embedding"
  },
  {
    "name": "update",
    "namespace": "inference",
    "description": "Update an inference endpoint.",
    "method": "PUT",
    "path": "/_inference/{task_type}/{inference_id}/_update",
    "namespaceFile": "inference_update"
  },
  {
    "name": "info",
    "namespace": null,
    "description": "Get cluster info.",
    "method": "GET",
    "path": "/",
    "namespaceFile": "info"
  },
  {
    "name": "delete-geoip-database",
    "namespace": "ingest",
    "description": "Delete GeoIP database configurations.",
    "method": "DELETE",
    "path": "/_ingest/geoip/database/{id}",
    "namespaceFile": "ingest_delete_geoip_database"
  },
  {
    "name": "delete-ip-location-database",
    "namespace": "ingest",
    "description": "Delete IP geolocation database configurations.",
    "method": "DELETE",
    "path": "/_ingest/ip_location/database/{id}",
    "namespaceFile": "ingest_delete_ip_location_database"
  },
  {
    "name": "delete-pipeline",
    "namespace": "ingest",
    "description": "Delete pipelines.",
    "method": "DELETE",
    "path": "/_ingest/pipeline/{id}",
    "namespaceFile": "ingest_delete_pipeline"
  },
  {
    "name": "geo-ip-stats",
    "namespace": "ingest",
    "description": "Get GeoIP statistics.",
    "method": "GET",
    "path": "/_ingest/geoip/stats",
    "namespaceFile": "ingest_geo_ip_stats"
  },
  {
    "name": "get-geoip-database",
    "namespace": "ingest",
    "description": "Get GeoIP database configurations.",
    "method": "GET",
    "path": "/_ingest/geoip/database/{id}",
    "namespaceFile": "ingest_get_geoip_database"
  },
  {
    "name": "get-ip-location-database",
    "namespace": "ingest",
    "description": "Get IP geolocation database configurations.",
    "method": "GET",
    "path": "/_ingest/ip_location/database/{id}",
    "namespaceFile": "ingest_get_ip_location_database"
  },
  {
    "name": "get-pipeline",
    "namespace": "ingest",
    "description": "Get pipelines.",
    "method": "GET",
    "path": "/_ingest/pipeline/{id}",
    "namespaceFile": "ingest_get_pipeline"
  },
  {
    "name": "processor-grok",
    "namespace": "ingest",
    "description": "Run a grok processor.",
    "method": "GET",
    "path": "/_ingest/processor/grok",
    "namespaceFile": "ingest_processor_grok"
  },
  {
    "name": "put-geoip-database",
    "namespace": "ingest",
    "description": "Create or update a GeoIP database configuration.",
    "method": "PUT",
    "path": "/_ingest/geoip/database/{id}",
    "namespaceFile": "ingest_put_geoip_database"
  },
  {
    "name": "put-ip-location-database",
    "namespace": "ingest",
    "description": "Create or update an IP geolocation database configuration.",
    "method": "PUT",
    "path": "/_ingest/ip_location/database/{id}",
    "namespaceFile": "ingest_put_ip_location_database"
  },
  {
    "name": "put-pipeline",
    "namespace": "ingest",
    "description": "Create or update a pipeline.",
    "method": "PUT",
    "path": "/_ingest/pipeline/{id}",
    "namespaceFile": "ingest_put_pipeline"
  },
  {
    "name": "simulate",
    "namespace": "ingest",
    "description": "Simulate a pipeline.",
    "method": "GET",
    "path": "/_ingest/pipeline/{id}/_simulate",
    "namespaceFile": "ingest_simulate"
  },
  {
    "name": "delete",
    "namespace": "license",
    "description": "Delete the license.",
    "method": "DELETE",
    "path": "/_license",
    "namespaceFile": "license_delete"
  },
  {
    "name": "get",
    "namespace": "license",
    "description": "Get license information.",
    "method": "GET",
    "path": "/_license",
    "namespaceFile": "license_get"
  },
  {
    "name": "get-basic-status",
    "namespace": "license",
    "description": "Get the basic license status.",
    "method": "GET",
    "path": "/_license/basic_status",
    "namespaceFile": "license_get_basic_status"
  },
  {
    "name": "get-trial-status",
    "namespace": "license",
    "description": "Get the trial status.",
    "method": "GET",
    "path": "/_license/trial_status",
    "namespaceFile": "license_get_trial_status"
  },
  {
    "name": "post",
    "namespace": "license",
    "description": "Update the license.",
    "method": "PUT",
    "path": "/_license",
    "namespaceFile": "license_post"
  },
  {
    "name": "post-start-basic",
    "namespace": "license",
    "description": "Start a basic license.",
    "method": "POST",
    "path": "/_license/start_basic",
    "namespaceFile": "license_post_start_basic"
  },
  {
    "name": "post-start-trial",
    "namespace": "license",
    "description": "Start a trial.",
    "method": "POST",
    "path": "/_license/start_trial",
    "namespaceFile": "license_post_start_trial"
  },
  {
    "name": "delete-pipeline",
    "namespace": "logstash",
    "description": "Delete a Logstash pipeline.",
    "method": "DELETE",
    "path": "/_logstash/pipeline/{id}",
    "namespaceFile": "logstash_delete_pipeline"
  },
  {
    "name": "get-pipeline",
    "namespace": "logstash",
    "description": "Get Logstash pipelines.",
    "method": "GET",
    "path": "/_logstash/pipeline/{id}",
    "namespaceFile": "logstash_get_pipeline"
  },
  {
    "name": "put-pipeline",
    "namespace": "logstash",
    "description": "Create or update a Logstash pipeline.",
    "method": "PUT",
    "path": "/_logstash/pipeline/{id}",
    "namespaceFile": "logstash_put_pipeline"
  },
  {
    "name": "mget",
    "namespace": null,
    "description": "Get multiple documents.",
    "method": "GET",
    "path": "/{index}/_mget",
    "namespaceFile": "mget"
  },
  {
    "name": "deprecations",
    "namespace": "migration",
    "description": "Get deprecation information.",
    "method": "GET",
    "path": "/{index}/_migration/deprecations",
    "namespaceFile": "migration_deprecations"
  },
  {
    "name": "get-feature-upgrade-status",
    "namespace": "migration",
    "description": "Get feature migration information.",
    "method": "GET",
    "path": "/_migration/system_features",
    "namespaceFile": "migration_get_feature_upgrade_status"
  },
  {
    "name": "post-feature-upgrade",
    "namespace": "migration",
    "description": "Start the feature migration.",
    "method": "POST",
    "path": "/_migration/system_features",
    "namespaceFile": "migration_post_feature_upgrade"
  },
  {
    "name": "clear-trained-model-deployment-cache",
    "namespace": "ml",
    "description": "Clear trained model deployment cache.",
    "method": "POST",
    "path": "/_ml/trained_models/{model_id}/deployment/cache/_clear",
    "namespaceFile": "ml_clear_trained_model_deployment_cache"
  },
  {
    "name": "close-job",
    "namespace": "ml",
    "description": "Close anomaly detection jobs.",
    "method": "POST",
    "path": "/_ml/anomaly_detectors/{job_id}/_close",
    "namespaceFile": "ml_close_job"
  },
  {
    "name": "delete-calendar",
    "namespace": "ml",
    "description": "Delete a calendar.",
    "method": "DELETE",
    "path": "/_ml/calendars/{calendar_id}",
    "namespaceFile": "ml_delete_calendar"
  },
  {
    "name": "delete-calendar-event",
    "namespace": "ml",
    "description": "Delete events from a calendar.",
    "method": "DELETE",
    "path": "/_ml/calendars/{calendar_id}/events/{event_id}",
    "namespaceFile": "ml_delete_calendar_event"
  },
  {
    "name": "delete-calendar-job",
    "namespace": "ml",
    "description": "Delete anomaly jobs from a calendar.",
    "method": "DELETE",
    "path": "/_ml/calendars/{calendar_id}/jobs/{job_id}",
    "namespaceFile": "ml_delete_calendar_job"
  },
  {
    "name": "delete-data-frame-analytics",
    "namespace": "ml",
    "description": "Delete a data frame analytics job.",
    "method": "DELETE",
    "path": "/_ml/data_frame/analytics/{id}",
    "namespaceFile": "ml_delete_data_frame_analytics"
  },
  {
    "name": "delete-datafeed",
    "namespace": "ml",
    "description": "Delete a datafeed.",
    "method": "DELETE",
    "path": "/_ml/datafeeds/{datafeed_id}",
    "namespaceFile": "ml_delete_datafeed"
  },
  {
    "name": "delete-expired-data",
    "namespace": "ml",
    "description": "Delete expired ML data.",
    "method": "DELETE",
    "path": "/_ml/_delete_expired_data/{job_id}",
    "namespaceFile": "ml_delete_expired_data"
  },
  {
    "name": "delete-filter",
    "namespace": "ml",
    "description": "Delete a filter.",
    "method": "DELETE",
    "path": "/_ml/filters/{filter_id}",
    "namespaceFile": "ml_delete_filter"
  },
  {
    "name": "delete-forecast",
    "namespace": "ml",
    "description": "Delete forecasts from a job.",
    "method": "DELETE",
    "path": "/_ml/anomaly_detectors/{job_id}/_forecast/{forecast_id}",
    "namespaceFile": "ml_delete_forecast"
  },
  {
    "name": "delete-job",
    "namespace": "ml",
    "description": "Delete an anomaly detection job.",
    "method": "DELETE",
    "path": "/_ml/anomaly_detectors/{job_id}",
    "namespaceFile": "ml_delete_job"
  },
  {
    "name": "delete-model-snapshot",
    "namespace": "ml",
    "description": "Delete a model snapshot.",
    "method": "DELETE",
    "path": "/_ml/anomaly_detectors/{job_id}/model_snapshots/{snapshot_id}",
    "namespaceFile": "ml_delete_model_snapshot"
  },
  {
    "name": "delete-trained-model",
    "namespace": "ml",
    "description": "Delete an unreferenced trained model.",
    "method": "DELETE",
    "path": "/_ml/trained_models/{model_id}",
    "namespaceFile": "ml_delete_trained_model"
  },
  {
    "name": "delete-trained-model-alias",
    "namespace": "ml",
    "description": "Delete a trained model alias.",
    "method": "DELETE",
    "path": "/_ml/trained_models/{model_id}/model_aliases/{model_alias}",
    "namespaceFile": "ml_delete_trained_model_alias"
  },
  {
    "name": "estimate-model-memory",
    "namespace": "ml",
    "description": "Estimate job model memory usage.",
    "method": "POST",
    "path": "/_ml/anomaly_detectors/_estimate_model_memory",
    "namespaceFile": "ml_estimate_model_memory"
  },
  {
    "name": "evaluate-data-frame",
    "namespace": "ml",
    "description": "Evaluate data frame analytics.",
    "method": "POST",
    "path": "/_ml/data_frame/_evaluate",
    "namespaceFile": "ml_evaluate_data_frame"
  },
  {
    "name": "explain-data-frame-analytics",
    "namespace": "ml",
    "description": "Explain data frame analytics config.",
    "method": "GET",
    "path": "/_ml/data_frame/analytics/{id}/_explain",
    "namespaceFile": "ml_explain_data_frame_analytics"
  },
  {
    "name": "flush-job",
    "namespace": "ml",
    "description": "Force buffered data to be processed.",
    "method": "POST",
    "path": "/_ml/anomaly_detectors/{job_id}/_flush",
    "namespaceFile": "ml_flush_job"
  },
  {
    "name": "forecast",
    "namespace": "ml",
    "description": "Predict future behavior of a time series.",
    "method": "POST",
    "path": "/_ml/anomaly_detectors/{job_id}/_forecast",
    "namespaceFile": "ml_forecast"
  },
  {
    "name": "get-buckets",
    "namespace": "ml",
    "description": "Get anomaly detection job results for buckets.",
    "method": "GET",
    "path": "/_ml/anomaly_detectors/{job_id}/results/buckets/{timestamp}",
    "namespaceFile": "ml_get_buckets"
  },
  {
    "name": "get-calendar-events",
    "namespace": "ml",
    "description": "Get info about events in calendars.",
    "method": "GET",
    "path": "/_ml/calendars/{calendar_id}/events",
    "namespaceFile": "ml_get_calendar_events"
  },
  {
    "name": "get-calendars",
    "namespace": "ml",
    "description": "Get calendar configuration info.",
    "method": "GET",
    "path": "/_ml/calendars/{calendar_id}",
    "namespaceFile": "ml_get_calendars"
  },
  {
    "name": "get-categories",
    "namespace": "ml",
    "description": "Get anomaly detection job results for categories.",
    "method": "GET",
    "path": "/_ml/anomaly_detectors/{job_id}/results/categories/{category_id}",
    "namespaceFile": "ml_get_categories"
  },
  {
    "name": "get-data-frame-analytics",
    "namespace": "ml",
    "description": "Get data frame analytics job configuration info.",
    "method": "GET",
    "path": "/_ml/data_frame/analytics/{id}",
    "namespaceFile": "ml_get_data_frame_analytics"
  },
  {
    "name": "get-data-frame-analytics-stats",
    "namespace": "ml",
    "description": "Get data frame analytics job stats.",
    "method": "GET",
    "path": "/_ml/data_frame/analytics/{id}/_stats",
    "namespaceFile": "ml_get_data_frame_analytics_stats"
  },
  {
    "name": "get-datafeed-stats",
    "namespace": "ml",
    "description": "Get datafeed stats.",
    "method": "GET",
    "path": "/_ml/datafeeds/{datafeed_id}/_stats",
    "namespaceFile": "ml_get_datafeed_stats"
  },
  {
    "name": "get-datafeeds",
    "namespace": "ml",
    "description": "Get datafeeds configuration info.",
    "method": "GET",
    "path": "/_ml/datafeeds/{datafeed_id}",
    "namespaceFile": "ml_get_datafeeds"
  },
  {
    "name": "get-filters",
    "namespace": "ml",
    "description": "Get filters.",
    "method": "GET",
    "path": "/_ml/filters/{filter_id}",
    "namespaceFile": "ml_get_filters"
  },
  {
    "name": "get-influencers",
    "namespace": "ml",
    "description": "Get anomaly detection job results for influencers.",
    "method": "GET",
    "path": "/_ml/anomaly_detectors/{job_id}/results/influencers",
    "namespaceFile": "ml_get_influencers"
  },
  {
    "name": "get-job-stats",
    "namespace": "ml",
    "description": "Get anomaly detection job stats.",
    "method": "GET",
    "path": "/_ml/anomaly_detectors/{job_id}/_stats",
    "namespaceFile": "ml_get_job_stats"
  },
  {
    "name": "get-jobs",
    "namespace": "ml",
    "description": "Get anomaly detection jobs configuration info.",
    "method": "GET",
    "path": "/_ml/anomaly_detectors/{job_id}",
    "namespaceFile": "ml_get_jobs"
  },
  {
    "name": "get-memory-stats",
    "namespace": "ml",
    "description": "Get machine learning memory usage info.",
    "method": "GET",
    "path": "/_ml/memory/{node_id}/_stats",
    "namespaceFile": "ml_get_memory_stats"
  },
  {
    "name": "get-model-snapshot-upgrade-stats",
    "namespace": "ml",
    "description": "Get anomaly detection job model snapshot upgrade usage info.",
    "method": "GET",
    "path": "/_ml/anomaly_detectors/{job_id}/model_snapshots/{snapshot_id}/_upgrade/_stats",
    "namespaceFile": "ml_get_model_snapshot_upgrade_stats"
  },
  {
    "name": "get-model-snapshots",
    "namespace": "ml",
    "description": "Get model snapshots info.",
    "method": "GET",
    "path": "/_ml/anomaly_detectors/{job_id}/model_snapshots/{snapshot_id}",
    "namespaceFile": "ml_get_model_snapshots"
  },
  {
    "name": "get-overall-buckets",
    "namespace": "ml",
    "description": "Get overall bucket results.",
    "method": "GET",
    "path": "/_ml/anomaly_detectors/{job_id}/results/overall_buckets",
    "namespaceFile": "ml_get_overall_buckets"
  },
  {
    "name": "get-records",
    "namespace": "ml",
    "description": "Get anomaly records for an anomaly detection job.",
    "method": "GET",
    "path": "/_ml/anomaly_detectors/{job_id}/results/records",
    "namespaceFile": "ml_get_records"
  },
  {
    "name": "get-trained-models",
    "namespace": "ml",
    "description": "Get trained model configuration info.",
    "method": "GET",
    "path": "/_ml/trained_models/{model_id}",
    "namespaceFile": "ml_get_trained_models"
  },
  {
    "name": "get-trained-models-stats",
    "namespace": "ml",
    "description": "Get trained models usage info.",
    "method": "GET",
    "path": "/_ml/trained_models/{model_id}/_stats",
    "namespaceFile": "ml_get_trained_models_stats"
  },
  {
    "name": "infer-trained-model",
    "namespace": "ml",
    "description": "Evaluate a trained model.",
    "method": "POST",
    "path": "/_ml/trained_models/{model_id}/_infer",
    "namespaceFile": "ml_infer_trained_model"
  },
  {
    "name": "info",
    "namespace": "ml",
    "description": "Get machine learning information.",
    "method": "GET",
    "path": "/_ml/info",
    "namespaceFile": "ml_info"
  },
  {
    "name": "open-job",
    "namespace": "ml",
    "description": "Open anomaly detection jobs.",
    "method": "POST",
    "path": "/_ml/anomaly_detectors/{job_id}/_open",
    "namespaceFile": "ml_open_job"
  },
  {
    "name": "post-calendar-events",
    "namespace": "ml",
    "description": "Add scheduled events to the calendar.",
    "method": "POST",
    "path": "/_ml/calendars/{calendar_id}/events",
    "namespaceFile": "ml_post_calendar_events"
  },
  {
    "name": "post-data",
    "namespace": "ml",
    "description": "Send data to an anomaly detection job for analysis.",
    "method": "POST",
    "path": "/_ml/anomaly_detectors/{job_id}/_data",
    "namespaceFile": "ml_post_data",
    "bodyFormat": "ndjson"
  },
  {
    "name": "preview-data-frame-analytics",
    "namespace": "ml",
    "description": "Preview features used by data frame analytics.",
    "method": "GET",
    "path": "/_ml/data_frame/analytics/{id}/_preview",
    "namespaceFile": "ml_preview_data_frame_analytics"
  },
  {
    "name": "preview-datafeed",
    "namespace": "ml",
    "description": "Preview a datafeed.",
    "method": "GET",
    "path": "/_ml/datafeeds/{datafeed_id}/_preview",
    "namespaceFile": "ml_preview_datafeed"
  },
  {
    "name": "put-calendar",
    "namespace": "ml",
    "description": "Create a calendar.",
    "method": "PUT",
    "path": "/_ml/calendars/{calendar_id}",
    "namespaceFile": "ml_put_calendar"
  },
  {
    "name": "put-calendar-job",
    "namespace": "ml",
    "description": "Add anomaly detection job to calendar.",
    "method": "PUT",
    "path": "/_ml/calendars/{calendar_id}/jobs/{job_id}",
    "namespaceFile": "ml_put_calendar_job"
  },
  {
    "name": "put-data-frame-analytics",
    "namespace": "ml",
    "description": "Create a data frame analytics job.",
    "method": "PUT",
    "path": "/_ml/data_frame/analytics/{id}",
    "namespaceFile": "ml_put_data_frame_analytics"
  },
  {
    "name": "put-datafeed",
    "namespace": "ml",
    "description": "Create a datafeed.",
    "method": "PUT",
    "path": "/_ml/datafeeds/{datafeed_id}",
    "namespaceFile": "ml_put_datafeed"
  },
  {
    "name": "put-filter",
    "namespace": "ml",
    "description": "Create a filter.",
    "method": "PUT",
    "path": "/_ml/filters/{filter_id}",
    "namespaceFile": "ml_put_filter"
  },
  {
    "name": "put-job",
    "namespace": "ml",
    "description": "Create an anomaly detection job.",
    "method": "PUT",
    "path": "/_ml/anomaly_detectors/{job_id}",
    "namespaceFile": "ml_put_job"
  },
  {
    "name": "put-trained-model",
    "namespace": "ml",
    "description": "Create a trained model.",
    "method": "PUT",
    "path": "/_ml/trained_models/{model_id}",
    "namespaceFile": "ml_put_trained_model"
  },
  {
    "name": "put-trained-model-alias",
    "namespace": "ml",
    "description": "Create or update a trained model alias.",
    "method": "PUT",
    "path": "/_ml/trained_models/{model_id}/model_aliases/{model_alias}",
    "namespaceFile": "ml_put_trained_model_alias"
  },
  {
    "name": "put-trained-model-definition-part",
    "namespace": "ml",
    "description": "Create part of a trained model definition.",
    "method": "PUT",
    "path": "/_ml/trained_models/{model_id}/definition/{part}",
    "namespaceFile": "ml_put_trained_model_definition_part"
  },
  {
    "name": "put-trained-model-vocabulary",
    "namespace": "ml",
    "description": "Create a trained model vocabulary.",
    "method": "PUT",
    "path": "/_ml/trained_models/{model_id}/vocabulary",
    "namespaceFile": "ml_put_trained_model_vocabulary"
  },
  {
    "name": "reset-job",
    "namespace": "ml",
    "description": "Reset an anomaly detection job.",
    "method": "POST",
    "path": "/_ml/anomaly_detectors/{job_id}/_reset",
    "namespaceFile": "ml_reset_job"
  },
  {
    "name": "revert-model-snapshot",
    "namespace": "ml",
    "description": "Revert to a snapshot.",
    "method": "POST",
    "path": "/_ml/anomaly_detectors/{job_id}/model_snapshots/{snapshot_id}/_revert",
    "namespaceFile": "ml_revert_model_snapshot"
  },
  {
    "name": "set-upgrade-mode",
    "namespace": "ml",
    "description": "Set upgrade_mode for ML indices.",
    "method": "POST",
    "path": "/_ml/set_upgrade_mode",
    "namespaceFile": "ml_set_upgrade_mode"
  },
  {
    "name": "start-data-frame-analytics",
    "namespace": "ml",
    "description": "Start a data frame analytics job.",
    "method": "POST",
    "path": "/_ml/data_frame/analytics/{id}/_start",
    "namespaceFile": "ml_start_data_frame_analytics"
  },
  {
    "name": "start-datafeed",
    "namespace": "ml",
    "description": "Start datafeeds.",
    "method": "POST",
    "path": "/_ml/datafeeds/{datafeed_id}/_start",
    "namespaceFile": "ml_start_datafeed"
  },
  {
    "name": "start-trained-model-deployment",
    "namespace": "ml",
    "description": "Start a trained model deployment.",
    "method": "POST",
    "path": "/_ml/trained_models/{model_id}/deployment/_start",
    "namespaceFile": "ml_start_trained_model_deployment"
  },
  {
    "name": "stop-data-frame-analytics",
    "namespace": "ml",
    "description": "Stop data frame analytics jobs.",
    "method": "POST",
    "path": "/_ml/data_frame/analytics/{id}/_stop",
    "namespaceFile": "ml_stop_data_frame_analytics"
  },
  {
    "name": "stop-datafeed",
    "namespace": "ml",
    "description": "Stop datafeeds.",
    "method": "POST",
    "path": "/_ml/datafeeds/{datafeed_id}/_stop",
    "namespaceFile": "ml_stop_datafeed"
  },
  {
    "name": "stop-trained-model-deployment",
    "namespace": "ml",
    "description": "Stop a trained model deployment.",
    "method": "POST",
    "path": "/_ml/trained_models/{model_id}/deployment/_stop",
    "namespaceFile": "ml_stop_trained_model_deployment"
  },
  {
    "name": "update-data-frame-analytics",
    "namespace": "ml",
    "description": "Update a data frame analytics job.",
    "method": "POST",
    "path": "/_ml/data_frame/analytics/{id}/_update",
    "namespaceFile": "ml_update_data_frame_analytics"
  },
  {
    "name": "update-datafeed",
    "namespace": "ml",
    "description": "Update a datafeed.",
    "method": "POST",
    "path": "/_ml/datafeeds/{datafeed_id}/_update",
    "namespaceFile": "ml_update_datafeed"
  },
  {
    "name": "update-filter",
    "namespace": "ml",
    "description": "Update a filter.",
    "method": "POST",
    "path": "/_ml/filters/{filter_id}/_update",
    "namespaceFile": "ml_update_filter"
  },
  {
    "name": "update-job",
    "namespace": "ml",
    "description": "Update an anomaly detection job.",
    "method": "POST",
    "path": "/_ml/anomaly_detectors/{job_id}/_update",
    "namespaceFile": "ml_update_job"
  },
  {
    "name": "update-model-snapshot",
    "namespace": "ml",
    "description": "Update a snapshot.",
    "method": "POST",
    "path": "/_ml/anomaly_detectors/{job_id}/model_snapshots/{snapshot_id}/_update",
    "namespaceFile": "ml_update_model_snapshot"
  },
  {
    "name": "update-trained-model-deployment",
    "namespace": "ml",
    "description": "Update a trained model deployment.",
    "method": "POST",
    "path": "/_ml/trained_models/{model_id}/deployment/_update",
    "namespaceFile": "ml_update_trained_model_deployment"
  },
  {
    "name": "upgrade-job-snapshot",
    "namespace": "ml",
    "description": "Upgrade a snapshot.",
    "method": "POST",
    "path": "/_ml/anomaly_detectors/{job_id}/model_snapshots/{snapshot_id}/_upgrade",
    "namespaceFile": "ml_upgrade_job_snapshot"
  },
  {
    "name": "msearch",
    "namespace": null,
    "description": "Run multiple searches.",
    "method": "GET",
    "path": "/{index}/_msearch",
    "namespaceFile": "msearch",
    "bodyFormat": "ndjson"
  },
  {
    "name": "msearch-template",
    "namespace": null,
    "description": "Run multiple templated searches.",
    "method": "GET",
    "path": "/{index}/_msearch/template",
    "namespaceFile": "msearch_template",
    "bodyFormat": "ndjson"
  },
  {
    "name": "mtermvectors",
    "namespace": null,
    "description": "Get multiple term vectors.",
    "method": "GET",
    "path": "/{index}/_mtermvectors",
    "namespaceFile": "mtermvectors"
  },
  {
    "name": "clear-repositories-metering-archive",
    "namespace": "nodes",
    "description": "Clear the archived repositories metering.",
    "method": "DELETE",
    "path": "/_nodes/{node_id}/_repositories_metering/{max_archive_version}",
    "namespaceFile": "nodes_clear_repositories_metering_archive"
  },
  {
    "name": "get-repositories-metering-info",
    "namespace": "nodes",
    "description": "Get cluster repositories metering.",
    "method": "GET",
    "path": "/_nodes/{node_id}/_repositories_metering",
    "namespaceFile": "nodes_get_repositories_metering_info"
  },
  {
    "name": "hot-threads",
    "namespace": "nodes",
    "description": "Get the hot threads for nodes.",
    "method": "GET",
    "path": "/_nodes/{node_id}/hot_threads",
    "namespaceFile": "nodes_hot_threads",
    "responseType": "text"
  },
  {
    "name": "info",
    "namespace": "nodes",
    "description": "Get node information.",
    "method": "GET",
    "path": "/_nodes/{node_id}/{metric}",
    "namespaceFile": "nodes_info"
  },
  {
    "name": "reload-secure-settings",
    "namespace": "nodes",
    "description": "Reload the keystore on nodes in the cluster.",
    "method": "POST",
    "path": "/_nodes/{node_id}/reload_secure_settings",
    "namespaceFile": "nodes_reload_secure_settings"
  },
  {
    "name": "stats",
    "namespace": "nodes",
    "description": "Get node statistics.",
    "method": "GET",
    "path": "/_nodes/{node_id}/stats/{metric}/{index_metric}",
    "namespaceFile": "nodes_stats"
  },
  {
    "name": "usage",
    "namespace": "nodes",
    "description": "Get feature usage information.",
    "method": "GET",
    "path": "/_nodes/{node_id}/usage/{metric}",
    "namespaceFile": "nodes_usage"
  },
  {
    "name": "open-point-in-time",
    "namespace": null,
    "description": "Open a point in time.",
    "method": "POST",
    "path": "/{index}/_pit",
    "namespaceFile": "open_point_in_time"
  },
  {
    "name": "ping",
    "namespace": null,
    "description": "Ping the cluster.",
    "method": "HEAD",
    "path": "/",
    "namespaceFile": "ping"
  },
  {
    "name": "create-many-routing",
    "namespace": "project",
    "description": "Create or update project routing expressions.",
    "method": "PUT",
    "path": "/_project_routing",
    "namespaceFile": "project_create_many_routing"
  },
  {
    "name": "create-routing",
    "namespace": "project",
    "description": "Create or update a project routing expression.",
    "method": "PUT",
    "path": "/_project_routing/{name}",
    "namespaceFile": "project_create_routing"
  },
  {
    "name": "delete-routing",
    "namespace": "project",
    "description": "Delete a project routing expression.",
    "method": "DELETE",
    "path": "/_project_routing/{name}",
    "namespaceFile": "project_delete_routing"
  },
  {
    "name": "get-many-routing",
    "namespace": "project",
    "description": "Get project routing expressions.",
    "method": "GET",
    "path": "/_project_routing",
    "namespaceFile": "project_get_many_routing"
  },
  {
    "name": "get-routing",
    "namespace": "project",
    "description": "Get a project routing expression.",
    "method": "GET",
    "path": "/_project_routing/{name}",
    "namespaceFile": "project_get_routing"
  },
  {
    "name": "tags",
    "namespace": "project",
    "description": "Get tags.",
    "method": "GET",
    "path": "/_project/tags",
    "namespaceFile": "project_tags"
  },
  {
    "name": "put-script",
    "namespace": null,
    "description": "Create or update a script or search template.",
    "method": "PUT",
    "path": "/_scripts/{id}/{context}",
    "namespaceFile": "put_script"
  },
  {
    "name": "delete-rule",
    "namespace": "query-rules",
    "description": "Delete a query rule.",
    "method": "DELETE",
    "path": "/_query_rules/{ruleset_id}/_rule/{rule_id}",
    "namespaceFile": "query_rules_delete_rule"
  },
  {
    "name": "delete-ruleset",
    "namespace": "query-rules",
    "description": "Delete a query ruleset.",
    "method": "DELETE",
    "path": "/_query_rules/{ruleset_id}",
    "namespaceFile": "query_rules_delete_ruleset"
  },
  {
    "name": "get-rule",
    "namespace": "query-rules",
    "description": "Get a query rule.",
    "method": "GET",
    "path": "/_query_rules/{ruleset_id}/_rule/{rule_id}",
    "namespaceFile": "query_rules_get_rule"
  },
  {
    "name": "get-ruleset",
    "namespace": "query-rules",
    "description": "Get a query ruleset.",
    "method": "GET",
    "path": "/_query_rules/{ruleset_id}",
    "namespaceFile": "query_rules_get_ruleset"
  },
  {
    "name": "list-rulesets",
    "namespace": "query-rules",
    "description": "Get all query rulesets.",
    "method": "GET",
    "path": "/_query_rules",
    "namespaceFile": "query_rules_list_rulesets"
  },
  {
    "name": "put-rule",
    "namespace": "query-rules",
    "description": "Create or update a query rule.",
    "method": "PUT",
    "path": "/_query_rules/{ruleset_id}/_rule/{rule_id}",
    "namespaceFile": "query_rules_put_rule"
  },
  {
    "name": "put-ruleset",
    "namespace": "query-rules",
    "description": "Create or update a query ruleset.",
    "method": "PUT",
    "path": "/_query_rules/{ruleset_id}",
    "namespaceFile": "query_rules_put_ruleset"
  },
  {
    "name": "test",
    "namespace": "query-rules",
    "description": "Test a query ruleset.",
    "method": "POST",
    "path": "/_query_rules/{ruleset_id}/_test",
    "namespaceFile": "query_rules_test"
  },
  {
    "name": "rank-eval",
    "namespace": null,
    "description": "Evaluate ranked search results.",
    "method": "GET",
    "path": "/{index}/_rank_eval",
    "namespaceFile": "rank_eval"
  },
  {
    "name": "reindex",
    "namespace": null,
    "description": "Reindex documents.",
    "method": "POST",
    "path": "/_reindex",
    "namespaceFile": "reindex"
  },
  {
    "name": "reindex-rethrottle",
    "namespace": null,
    "description": "Throttle a reindex operation.",
    "method": "POST",
    "path": "/_reindex/{task_id}/_rethrottle",
    "namespaceFile": "reindex_rethrottle"
  },
  {
    "name": "render-search-template",
    "namespace": null,
    "description": "Render a search template.",
    "method": "GET",
    "path": "/_render/template/{id}",
    "namespaceFile": "render_search_template"
  },
  {
    "name": "delete-job",
    "namespace": "rollup",
    "description": "Delete a rollup job.",
    "method": "DELETE",
    "path": "/_rollup/job/{id}",
    "namespaceFile": "rollup_delete_job"
  },
  {
    "name": "get-jobs",
    "namespace": "rollup",
    "description": "Get rollup job information.",
    "method": "GET",
    "path": "/_rollup/job/{id}",
    "namespaceFile": "rollup_get_jobs"
  },
  {
    "name": "get-rollup-caps",
    "namespace": "rollup",
    "description": "Get the rollup job capabilities.",
    "method": "GET",
    "path": "/_rollup/data/{id}",
    "namespaceFile": "rollup_get_rollup_caps"
  },
  {
    "name": "get-rollup-index-caps",
    "namespace": "rollup",
    "description": "Get the rollup index capabilities.",
    "method": "GET",
    "path": "/{index}/_rollup/data",
    "namespaceFile": "rollup_get_rollup_index_caps"
  },
  {
    "name": "put-job",
    "namespace": "rollup",
    "description": "Create a rollup job.",
    "method": "PUT",
    "path": "/_rollup/job/{id}",
    "namespaceFile": "rollup_put_job"
  },
  {
    "name": "rollup-search",
    "namespace": "rollup",
    "description": "Search rolled-up data.",
    "method": "GET",
    "path": "/{index}/_rollup_search",
    "namespaceFile": "rollup_rollup_search"
  },
  {
    "name": "start-job",
    "namespace": "rollup",
    "description": "Start rollup jobs.",
    "method": "POST",
    "path": "/_rollup/job/{id}/_start",
    "namespaceFile": "rollup_start_job"
  },
  {
    "name": "stop-job",
    "namespace": "rollup",
    "description": "Stop rollup jobs.",
    "method": "POST",
    "path": "/_rollup/job/{id}/_stop",
    "namespaceFile": "rollup_stop_job"
  },
  {
    "name": "scripts-painless-execute",
    "namespace": null,
    "description": "Run a script.",
    "method": "GET",
    "path": "/_scripts/painless/_execute",
    "namespaceFile": "scripts_painless_execute"
  },
  {
    "name": "scroll",
    "namespace": null,
    "description": "Run a scrolling search.",
    "method": "GET",
    "path": "/_search/scroll",
    "namespaceFile": "scroll"
  },
  {
    "name": "search",
    "namespace": null,
    "description": "Run a search.",
    "method": "GET",
    "path": "/{index}/_search",
    "namespaceFile": "search"
  },
  {
    "name": "delete",
    "namespace": "search-application",
    "description": "Delete a search application.",
    "method": "DELETE",
    "path": "/_application/search_application/{name}",
    "namespaceFile": "search_application_delete"
  },
  {
    "name": "delete-behavioral-analytics",
    "namespace": "search-application",
    "description": "Delete a behavioral analytics collection.",
    "method": "DELETE",
    "path": "/_application/analytics/{name}",
    "namespaceFile": "search_application_delete_behavioral_analytics"
  },
  {
    "name": "get",
    "namespace": "search-application",
    "description": "Get search application details.",
    "method": "GET",
    "path": "/_application/search_application/{name}",
    "namespaceFile": "search_application_get"
  },
  {
    "name": "get-behavioral-analytics",
    "namespace": "search-application",
    "description": "Get behavioral analytics collections.",
    "method": "GET",
    "path": "/_application/analytics/{name}",
    "namespaceFile": "search_application_get_behavioral_analytics"
  },
  {
    "name": "list",
    "namespace": "search-application",
    "description": "Get search applications.",
    "method": "GET",
    "path": "/_application/search_application",
    "namespaceFile": "search_application_list"
  },
  {
    "name": "post-behavioral-analytics-event",
    "namespace": "search-application",
    "description": "Create a behavioral analytics collection event.",
    "method": "POST",
    "path": "/_application/analytics/{collection_name}/event/{event_type}",
    "namespaceFile": "search_application_post_behavioral_analytics_event"
  },
  {
    "name": "put",
    "namespace": "search-application",
    "description": "Create or update a search application.",
    "method": "PUT",
    "path": "/_application/search_application/{name}",
    "namespaceFile": "search_application_put"
  },
  {
    "name": "put-behavioral-analytics",
    "namespace": "search-application",
    "description": "Create a behavioral analytics collection.",
    "method": "PUT",
    "path": "/_application/analytics/{name}",
    "namespaceFile": "search_application_put_behavioral_analytics"
  },
  {
    "name": "render-query",
    "namespace": "search-application",
    "description": "Render a search application query.",
    "method": "POST",
    "path": "/_application/search_application/{name}/_render_query",
    "namespaceFile": "search_application_render_query"
  },
  {
    "name": "search",
    "namespace": "search-application",
    "description": "Run a search application search.",
    "method": "GET",
    "path": "/_application/search_application/{name}/_search",
    "namespaceFile": "search_application_search"
  },
  {
    "name": "search-mvt",
    "namespace": null,
    "description": "Search a vector tile.",
    "method": "POST",
    "path": "/{index}/_mvt/{field}/{zoom}/{x}/{y}",
    "namespaceFile": "search_mvt"
  },
  {
    "name": "search-shards",
    "namespace": null,
    "description": "Get the search shards.",
    "method": "GET",
    "path": "/{index}/_search_shards",
    "namespaceFile": "search_shards"
  },
  {
    "name": "search-template",
    "namespace": null,
    "description": "Run a search with a search template.",
    "method": "GET",
    "path": "/{index}/_search/template",
    "namespaceFile": "search_template"
  },
  {
    "name": "cache-stats",
    "namespace": "searchable-snapshots",
    "description": "Get cache statistics.",
    "method": "GET",
    "path": "/_searchable_snapshots/{node_id}/cache/stats",
    "namespaceFile": "searchable_snapshots_cache_stats"
  },
  {
    "name": "clear-cache",
    "namespace": "searchable-snapshots",
    "description": "Clear the cache.",
    "method": "POST",
    "path": "/{index}/_searchable_snapshots/cache/clear",
    "namespaceFile": "searchable_snapshots_clear_cache"
  },
  {
    "name": "mount",
    "namespace": "searchable-snapshots",
    "description": "Mount a snapshot.",
    "method": "POST",
    "path": "/_snapshot/{repository}/{snapshot}/_mount",
    "namespaceFile": "searchable_snapshots_mount"
  },
  {
    "name": "stats",
    "namespace": "searchable-snapshots",
    "description": "Get searchable snapshot statistics.",
    "method": "GET",
    "path": "/{index}/_searchable_snapshots/stats",
    "namespaceFile": "searchable_snapshots_stats"
  },
  {
    "name": "activate-user-profile",
    "namespace": "security",
    "description": "Activate a user profile.",
    "method": "POST",
    "path": "/_security/profile/_activate",
    "namespaceFile": "security_activate_user_profile"
  },
  {
    "name": "authenticate",
    "namespace": "security",
    "description": "Authenticate a user.",
    "method": "GET",
    "path": "/_security/_authenticate",
    "namespaceFile": "security_authenticate"
  },
  {
    "name": "bulk-delete-role",
    "namespace": "security",
    "description": "Bulk delete roles.",
    "method": "DELETE",
    "path": "/_security/role",
    "namespaceFile": "security_bulk_delete_role"
  },
  {
    "name": "bulk-put-role",
    "namespace": "security",
    "description": "Bulk create or update roles.",
    "method": "POST",
    "path": "/_security/role",
    "namespaceFile": "security_bulk_put_role"
  },
  {
    "name": "bulk-update-api-keys",
    "namespace": "security",
    "description": "Bulk update API keys.",
    "method": "POST",
    "path": "/_security/api_key/_bulk_update",
    "namespaceFile": "security_bulk_update_api_keys"
  },
  {
    "name": "change-password",
    "namespace": "security",
    "description": "Change passwords.",
    "method": "PUT",
    "path": "/_security/user/{username}/_password",
    "namespaceFile": "security_change_password"
  },
  {
    "name": "clear-api-key-cache",
    "namespace": "security",
    "description": "Clear the API key cache.",
    "method": "POST",
    "path": "/_security/api_key/{ids}/_clear_cache",
    "namespaceFile": "security_clear_api_key_cache"
  },
  {
    "name": "clear-cached-privileges",
    "namespace": "security",
    "description": "Clear the privileges cache.",
    "method": "POST",
    "path": "/_security/privilege/{application}/_clear_cache",
    "namespaceFile": "security_clear_cached_privileges"
  },
  {
    "name": "clear-cached-realms",
    "namespace": "security",
    "description": "Clear the user cache.",
    "method": "POST",
    "path": "/_security/realm/{realms}/_clear_cache",
    "namespaceFile": "security_clear_cached_realms"
  },
  {
    "name": "clear-cached-roles",
    "namespace": "security",
    "description": "Clear the roles cache.",
    "method": "POST",
    "path": "/_security/role/{name}/_clear_cache",
    "namespaceFile": "security_clear_cached_roles"
  },
  {
    "name": "clear-cached-service-tokens",
    "namespace": "security",
    "description": "Clear service account token caches.",
    "method": "POST",
    "path": "/_security/service/{namespace}/{service}/credential/token/{name}/_clear_cache",
    "namespaceFile": "security_clear_cached_service_tokens"
  },
  {
    "name": "clone-api-key",
    "namespace": "security",
    "description": "Clone an API key.",
    "method": "POST",
    "path": "/_security/api_key/clone",
    "namespaceFile": "security_clone_api_key"
  },
  {
    "name": "create-api-key",
    "namespace": "security",
    "description": "Create an API key.",
    "method": "PUT",
    "path": "/_security/api_key",
    "namespaceFile": "security_create_api_key"
  },
  {
    "name": "create-cross-cluster-api-key",
    "namespace": "security",
    "description": "Create a cross-cluster API key.",
    "method": "POST",
    "path": "/_security/cross_cluster/api_key",
    "namespaceFile": "security_create_cross_cluster_api_key"
  },
  {
    "name": "create-service-token",
    "namespace": "security",
    "description": "Create a service account token.",
    "method": "PUT",
    "path": "/_security/service/{namespace}/{service}/credential/token/{name}",
    "namespaceFile": "security_create_service_token"
  },
  {
    "name": "delegate-pki",
    "namespace": "security",
    "description": "Delegate PKI authentication.",
    "method": "POST",
    "path": "/_security/delegate_pki",
    "namespaceFile": "security_delegate_pki"
  },
  {
    "name": "delete-privileges",
    "namespace": "security",
    "description": "Delete application privileges.",
    "method": "DELETE",
    "path": "/_security/privilege/{application}/{name}",
    "namespaceFile": "security_delete_privileges"
  },
  {
    "name": "delete-role",
    "namespace": "security",
    "description": "Delete roles.",
    "method": "DELETE",
    "path": "/_security/role/{name}",
    "namespaceFile": "security_delete_role"
  },
  {
    "name": "delete-role-mapping",
    "namespace": "security",
    "description": "Delete role mappings.",
    "method": "DELETE",
    "path": "/_security/role_mapping/{name}",
    "namespaceFile": "security_delete_role_mapping"
  },
  {
    "name": "delete-service-token",
    "namespace": "security",
    "description": "Delete service account tokens.",
    "method": "DELETE",
    "path": "/_security/service/{namespace}/{service}/credential/token/{name}",
    "namespaceFile": "security_delete_service_token"
  },
  {
    "name": "delete-user",
    "namespace": "security",
    "description": "Delete users.",
    "method": "DELETE",
    "path": "/_security/user/{username}",
    "namespaceFile": "security_delete_user"
  },
  {
    "name": "disable-user",
    "namespace": "security",
    "description": "Disable users.",
    "method": "PUT",
    "path": "/_security/user/{username}/_disable",
    "namespaceFile": "security_disable_user"
  },
  {
    "name": "disable-user-profile",
    "namespace": "security",
    "description": "Disable a user profile.",
    "method": "PUT",
    "path": "/_security/profile/{uid}/_disable",
    "namespaceFile": "security_disable_user_profile"
  },
  {
    "name": "enable-user",
    "namespace": "security",
    "description": "Enable users.",
    "method": "PUT",
    "path": "/_security/user/{username}/_enable",
    "namespaceFile": "security_enable_user"
  },
  {
    "name": "enable-user-profile",
    "namespace": "security",
    "description": "Enable a user profile.",
    "method": "PUT",
    "path": "/_security/profile/{uid}/_enable",
    "namespaceFile": "security_enable_user_profile"
  },
  {
    "name": "enroll-kibana",
    "namespace": "security",
    "description": "Enroll Kibana.",
    "method": "GET",
    "path": "/_security/enroll/kibana",
    "namespaceFile": "security_enroll_kibana"
  },
  {
    "name": "enroll-node",
    "namespace": "security",
    "description": "Enroll a node.",
    "method": "GET",
    "path": "/_security/enroll/node",
    "namespaceFile": "security_enroll_node"
  },
  {
    "name": "get-api-key",
    "namespace": "security",
    "description": "Get API key information.",
    "method": "GET",
    "path": "/_security/api_key",
    "namespaceFile": "security_get_api_key"
  },
  {
    "name": "get-builtin-privileges",
    "namespace": "security",
    "description": "Get builtin privileges.",
    "method": "GET",
    "path": "/_security/privilege/_builtin",
    "namespaceFile": "security_get_builtin_privileges"
  },
  {
    "name": "get-privileges",
    "namespace": "security",
    "description": "Get application privileges.",
    "method": "GET",
    "path": "/_security/privilege/{application}/{name}",
    "namespaceFile": "security_get_privileges"
  },
  {
    "name": "get-role",
    "namespace": "security",
    "description": "Get roles.",
    "method": "GET",
    "path": "/_security/role/{name}",
    "namespaceFile": "security_get_role"
  },
  {
    "name": "get-role-mapping",
    "namespace": "security",
    "description": "Get role mappings.",
    "method": "GET",
    "path": "/_security/role_mapping/{name}",
    "namespaceFile": "security_get_role_mapping"
  },
  {
    "name": "get-service-accounts",
    "namespace": "security",
    "description": "Get service accounts.",
    "method": "GET",
    "path": "/_security/service/{namespace}/{service}",
    "namespaceFile": "security_get_service_accounts"
  },
  {
    "name": "get-service-credentials",
    "namespace": "security",
    "description": "Get service account credentials.",
    "method": "GET",
    "path": "/_security/service/{namespace}/{service}/credential",
    "namespaceFile": "security_get_service_credentials"
  },
  {
    "name": "get-settings",
    "namespace": "security",
    "description": "Get security index settings.",
    "method": "GET",
    "path": "/_security/settings",
    "namespaceFile": "security_get_settings"
  },
  {
    "name": "get-stats",
    "namespace": "security",
    "description": "Get security stats.",
    "method": "GET",
    "path": "/_security/stats",
    "namespaceFile": "security_get_stats"
  },
  {
    "name": "get-token",
    "namespace": "security",
    "description": "Get a token.",
    "method": "POST",
    "path": "/_security/oauth2/token",
    "namespaceFile": "security_get_token"
  },
  {
    "name": "get-user",
    "namespace": "security",
    "description": "Get users.",
    "method": "GET",
    "path": "/_security/user/{username}",
    "namespaceFile": "security_get_user"
  },
  {
    "name": "get-user-privileges",
    "namespace": "security",
    "description": "Get user privileges.",
    "method": "GET",
    "path": "/_security/user/_privileges",
    "namespaceFile": "security_get_user_privileges"
  },
  {
    "name": "get-user-profile",
    "namespace": "security",
    "description": "Get a user profile.",
    "method": "GET",
    "path": "/_security/profile/{uid}",
    "namespaceFile": "security_get_user_profile"
  },
  {
    "name": "grant-api-key",
    "namespace": "security",
    "description": "Grant an API key.",
    "method": "POST",
    "path": "/_security/api_key/grant",
    "namespaceFile": "security_grant_api_key"
  },
  {
    "name": "has-privileges",
    "namespace": "security",
    "description": "Check user privileges.",
    "method": "GET",
    "path": "/_security/user/{user}/_has_privileges",
    "namespaceFile": "security_has_privileges"
  },
  {
    "name": "has-privileges-user-profile",
    "namespace": "security",
    "description": "Check user profile privileges.",
    "method": "GET",
    "path": "/_security/profile/_has_privileges",
    "namespaceFile": "security_has_privileges_user_profile"
  },
  {
    "name": "invalidate-api-key",
    "namespace": "security",
    "description": "Invalidate API keys.",
    "method": "DELETE",
    "path": "/_security/api_key",
    "namespaceFile": "security_invalidate_api_key"
  },
  {
    "name": "invalidate-token",
    "namespace": "security",
    "description": "Invalidate a token.",
    "method": "DELETE",
    "path": "/_security/oauth2/token",
    "namespaceFile": "security_invalidate_token"
  },
  {
    "name": "oidc-authenticate",
    "namespace": "security",
    "description": "Authenticate OpenID Connect.",
    "method": "POST",
    "path": "/_security/oidc/authenticate",
    "namespaceFile": "security_oidc_authenticate"
  },
  {
    "name": "oidc-logout",
    "namespace": "security",
    "description": "Logout of OpenID Connect.",
    "method": "POST",
    "path": "/_security/oidc/logout",
    "namespaceFile": "security_oidc_logout"
  },
  {
    "name": "oidc-prepare-authentication",
    "namespace": "security",
    "description": "Prepare OpenID connect authentication.",
    "method": "POST",
    "path": "/_security/oidc/prepare",
    "namespaceFile": "security_oidc_prepare_authentication"
  },
  {
    "name": "put-privileges",
    "namespace": "security",
    "description": "Create or update application privileges.",
    "method": "PUT",
    "path": "/_security/privilege",
    "namespaceFile": "security_put_privileges"
  },
  {
    "name": "put-role",
    "namespace": "security",
    "description": "Create or update roles.",
    "method": "PUT",
    "path": "/_security/role/{name}",
    "namespaceFile": "security_put_role"
  },
  {
    "name": "put-role-mapping",
    "namespace": "security",
    "description": "Create or update role mappings.",
    "method": "PUT",
    "path": "/_security/role_mapping/{name}",
    "namespaceFile": "security_put_role_mapping"
  },
  {
    "name": "put-user",
    "namespace": "security",
    "description": "Create or update users.",
    "method": "PUT",
    "path": "/_security/user/{username}",
    "namespaceFile": "security_put_user"
  },
  {
    "name": "query-api-keys",
    "namespace": "security",
    "description": "Find API keys with a query.",
    "method": "GET",
    "path": "/_security/_query/api_key",
    "namespaceFile": "security_query_api_keys"
  },
  {
    "name": "query-role",
    "namespace": "security",
    "description": "Find roles with a query.",
    "method": "GET",
    "path": "/_security/_query/role",
    "namespaceFile": "security_query_role"
  },
  {
    "name": "query-user",
    "namespace": "security",
    "description": "Find users with a query.",
    "method": "GET",
    "path": "/_security/_query/user",
    "namespaceFile": "security_query_user"
  },
  {
    "name": "saml-authenticate",
    "namespace": "security",
    "description": "Authenticate SAML.",
    "method": "POST",
    "path": "/_security/saml/authenticate",
    "namespaceFile": "security_saml_authenticate"
  },
  {
    "name": "saml-complete-logout",
    "namespace": "security",
    "description": "Logout of SAML completely.",
    "method": "POST",
    "path": "/_security/saml/complete_logout",
    "namespaceFile": "security_saml_complete_logout"
  },
  {
    "name": "saml-invalidate",
    "namespace": "security",
    "description": "Invalidate SAML.",
    "method": "POST",
    "path": "/_security/saml/invalidate",
    "namespaceFile": "security_saml_invalidate"
  },
  {
    "name": "saml-logout",
    "namespace": "security",
    "description": "Logout of SAML.",
    "method": "POST",
    "path": "/_security/saml/logout",
    "namespaceFile": "security_saml_logout"
  },
  {
    "name": "saml-prepare-authentication",
    "namespace": "security",
    "description": "Prepare SAML authentication.",
    "method": "POST",
    "path": "/_security/saml/prepare",
    "namespaceFile": "security_saml_prepare_authentication"
  },
  {
    "name": "saml-service-provider-metadata",
    "namespace": "security",
    "description": "Create SAML service provider metadata.",
    "method": "GET",
    "path": "/_security/saml/metadata/{realm_name}",
    "namespaceFile": "security_saml_service_provider_metadata"
  },
  {
    "name": "suggest-user-profiles",
    "namespace": "security",
    "description": "Suggest a user profile.",
    "method": "GET",
    "path": "/_security/profile/_suggest",
    "namespaceFile": "security_suggest_user_profiles"
  },
  {
    "name": "update-api-key",
    "namespace": "security",
    "description": "Update an API key.",
    "method": "PUT",
    "path": "/_security/api_key/{id}",
    "namespaceFile": "security_update_api_key"
  },
  {
    "name": "update-cross-cluster-api-key",
    "namespace": "security",
    "description": "Update a cross-cluster API key.",
    "method": "PUT",
    "path": "/_security/cross_cluster/api_key/{id}",
    "namespaceFile": "security_update_cross_cluster_api_key"
  },
  {
    "name": "update-settings",
    "namespace": "security",
    "description": "Update security index settings.",
    "method": "PUT",
    "path": "/_security/settings",
    "namespaceFile": "security_update_settings"
  },
  {
    "name": "update-user-profile-data",
    "namespace": "security",
    "description": "Update user profile data.",
    "method": "PUT",
    "path": "/_security/profile/{uid}/_data",
    "namespaceFile": "security_update_user_profile_data"
  },
  {
    "name": "ingest",
    "namespace": "simulate",
    "description": "Simulate data ingestion.",
    "method": "GET",
    "path": "/_ingest/{index}/_simulate",
    "namespaceFile": "simulate_ingest"
  },
  {
    "name": "delete-lifecycle",
    "namespace": "slm",
    "description": "Delete a policy.",
    "method": "DELETE",
    "path": "/_slm/policy/{policy_id}",
    "namespaceFile": "slm_delete_lifecycle"
  },
  {
    "name": "execute-lifecycle",
    "namespace": "slm",
    "description": "Run a policy.",
    "method": "PUT",
    "path": "/_slm/policy/{policy_id}/_execute",
    "namespaceFile": "slm_execute_lifecycle"
  },
  {
    "name": "execute-retention",
    "namespace": "slm",
    "description": "Run a retention policy.",
    "method": "POST",
    "path": "/_slm/_execute_retention",
    "namespaceFile": "slm_execute_retention"
  },
  {
    "name": "get-lifecycle",
    "namespace": "slm",
    "description": "Get policy information.",
    "method": "GET",
    "path": "/_slm/policy/{policy_id}",
    "namespaceFile": "slm_get_lifecycle"
  },
  {
    "name": "get-stats",
    "namespace": "slm",
    "description": "Get snapshot lifecycle management statistics.",
    "method": "GET",
    "path": "/_slm/stats",
    "namespaceFile": "slm_get_stats"
  },
  {
    "name": "get-status",
    "namespace": "slm",
    "description": "Get the snapshot lifecycle management status.",
    "method": "GET",
    "path": "/_slm/status",
    "namespaceFile": "slm_get_status"
  },
  {
    "name": "put-lifecycle",
    "namespace": "slm",
    "description": "Create or update a policy.",
    "method": "PUT",
    "path": "/_slm/policy/{policy_id}",
    "namespaceFile": "slm_put_lifecycle"
  },
  {
    "name": "start",
    "namespace": "slm",
    "description": "Start snapshot lifecycle management.",
    "method": "POST",
    "path": "/_slm/start",
    "namespaceFile": "slm_start"
  },
  {
    "name": "stop",
    "namespace": "slm",
    "description": "Stop snapshot lifecycle management.",
    "method": "POST",
    "path": "/_slm/stop",
    "namespaceFile": "slm_stop"
  },
  {
    "name": "cleanup-repository",
    "namespace": "snapshot",
    "description": "Clean up the snapshot repository.",
    "method": "POST",
    "path": "/_snapshot/{repository}/_cleanup",
    "namespaceFile": "snapshot_cleanup_repository"
  },
  {
    "name": "clone",
    "namespace": "snapshot",
    "description": "Clone a snapshot.",
    "method": "PUT",
    "path": "/_snapshot/{repository}/{snapshot}/_clone/{target_snapshot}",
    "namespaceFile": "snapshot_clone"
  },
  {
    "name": "create",
    "namespace": "snapshot",
    "description": "Create a snapshot.",
    "method": "PUT",
    "path": "/_snapshot/{repository}/{snapshot}",
    "namespaceFile": "snapshot_create"
  },
  {
    "name": "create-repository",
    "namespace": "snapshot",
    "description": "Create or update a snapshot repository.",
    "method": "PUT",
    "path": "/_snapshot/{repository}",
    "namespaceFile": "snapshot_create_repository"
  },
  {
    "name": "delete",
    "namespace": "snapshot",
    "description": "Delete snapshots.",
    "method": "DELETE",
    "path": "/_snapshot/{repository}/{snapshot}",
    "namespaceFile": "snapshot_delete"
  },
  {
    "name": "delete-repository",
    "namespace": "snapshot",
    "description": "Delete snapshot repositories.",
    "method": "DELETE",
    "path": "/_snapshot/{repository}",
    "namespaceFile": "snapshot_delete_repository"
  },
  {
    "name": "get",
    "namespace": "snapshot",
    "description": "Get snapshot information.",
    "method": "GET",
    "path": "/_snapshot/{repository}/{snapshot}",
    "namespaceFile": "snapshot_get"
  },
  {
    "name": "get-repository",
    "namespace": "snapshot",
    "description": "Get snapshot repository information.",
    "method": "GET",
    "path": "/_snapshot/{repository}",
    "namespaceFile": "snapshot_get_repository"
  },
  {
    "name": "repository-analyze",
    "namespace": "snapshot",
    "description": "Analyze a snapshot repository.",
    "method": "POST",
    "path": "/_snapshot/{repository}/_analyze",
    "namespaceFile": "snapshot_repository_analyze"
  },
  {
    "name": "repository-verify-integrity",
    "namespace": "snapshot",
    "description": "Verify the repository integrity.",
    "method": "POST",
    "path": "/_snapshot/{repository}/_verify_integrity",
    "namespaceFile": "snapshot_repository_verify_integrity"
  },
  {
    "name": "restore",
    "namespace": "snapshot",
    "description": "Restore a snapshot.",
    "method": "POST",
    "path": "/_snapshot/{repository}/{snapshot}/_restore",
    "namespaceFile": "snapshot_restore"
  },
  {
    "name": "status",
    "namespace": "snapshot",
    "description": "Get the snapshot status.",
    "method": "GET",
    "path": "/_snapshot/{repository}/{snapshot}/_status",
    "namespaceFile": "snapshot_status"
  },
  {
    "name": "verify-repository",
    "namespace": "snapshot",
    "description": "Verify a snapshot repository.",
    "method": "POST",
    "path": "/_snapshot/{repository}/_verify",
    "namespaceFile": "snapshot_verify_repository"
  },
  {
    "name": "clear-cursor",
    "namespace": "sql",
    "description": "Clear an SQL search cursor.",
    "method": "POST",
    "path": "/_sql/close",
    "namespaceFile": "sql_clear_cursor"
  },
  {
    "name": "delete-async",
    "namespace": "sql",
    "description": "Delete an async SQL search.",
    "method": "DELETE",
    "path": "/_sql/async/delete/{id}",
    "namespaceFile": "sql_delete_async"
  },
  {
    "name": "get-async",
    "namespace": "sql",
    "description": "Get async SQL search results.",
    "method": "GET",
    "path": "/_sql/async/{id}",
    "namespaceFile": "sql_get_async"
  },
  {
    "name": "get-async-status",
    "namespace": "sql",
    "description": "Get the async SQL search status.",
    "method": "GET",
    "path": "/_sql/async/status/{id}",
    "namespaceFile": "sql_get_async_status"
  },
  {
    "name": "query",
    "namespace": "sql",
    "description": "Get SQL search results.",
    "method": "POST",
    "path": "/_sql",
    "namespaceFile": "sql_query"
  },
  {
    "name": "translate",
    "namespace": "sql",
    "description": "Translate SQL into Elasticsearch queries.",
    "method": "POST",
    "path": "/_sql/translate",
    "namespaceFile": "sql_translate"
  },
  {
    "name": "certificates",
    "namespace": "ssl",
    "description": "Get SSL certificates.",
    "method": "GET",
    "path": "/_ssl/certificates",
    "namespaceFile": "ssl_certificates"
  },
  {
    "name": "logs-disable",
    "namespace": "streams",
    "description": "Disable a named stream.",
    "method": "POST",
    "path": "/_streams/{name}/_disable",
    "namespaceFile": "streams_logs_disable"
  },
  {
    "name": "logs-enable",
    "namespace": "streams",
    "description": "Enable a named stream.",
    "method": "POST",
    "path": "/_streams/{name}/_enable",
    "namespaceFile": "streams_logs_enable"
  },
  {
    "name": "status",
    "namespace": "streams",
    "description": "Get the status of streams.",
    "method": "GET",
    "path": "/_streams/status",
    "namespaceFile": "streams_status"
  },
  {
    "name": "delete-synonym",
    "namespace": "synonyms",
    "description": "Delete a synonym set.",
    "method": "DELETE",
    "path": "/_synonyms/{id}",
    "namespaceFile": "synonyms_delete_synonym"
  },
  {
    "name": "delete-synonym-rule",
    "namespace": "synonyms",
    "description": "Delete a synonym rule.",
    "method": "DELETE",
    "path": "/_synonyms/{set_id}/{rule_id}",
    "namespaceFile": "synonyms_delete_synonym_rule"
  },
  {
    "name": "get-synonym",
    "namespace": "synonyms",
    "description": "Get a synonym set.",
    "method": "GET",
    "path": "/_synonyms/{id}",
    "namespaceFile": "synonyms_get_synonym"
  },
  {
    "name": "get-synonym-rule",
    "namespace": "synonyms",
    "description": "Get a synonym rule.",
    "method": "GET",
    "path": "/_synonyms/{set_id}/{rule_id}",
    "namespaceFile": "synonyms_get_synonym_rule"
  },
  {
    "name": "get-synonyms-sets",
    "namespace": "synonyms",
    "description": "Get all synonym sets.",
    "method": "GET",
    "path": "/_synonyms",
    "namespaceFile": "synonyms_get_synonyms_sets"
  },
  {
    "name": "put-synonym",
    "namespace": "synonyms",
    "description": "Create or update a synonym set.",
    "method": "PUT",
    "path": "/_synonyms/{id}",
    "namespaceFile": "synonyms_put_synonym"
  },
  {
    "name": "put-synonym-rule",
    "namespace": "synonyms",
    "description": "Create or update a synonym rule.",
    "method": "PUT",
    "path": "/_synonyms/{set_id}/{rule_id}",
    "namespaceFile": "synonyms_put_synonym_rule"
  },
  {
    "name": "cancel",
    "namespace": "tasks",
    "description": "Cancel a task.",
    "method": "POST",
    "path": "/_tasks/{task_id}/_cancel",
    "namespaceFile": "tasks_cancel"
  },
  {
    "name": "get",
    "namespace": "tasks",
    "description": "Get task information.",
    "method": "GET",
    "path": "/_tasks/{task_id}",
    "namespaceFile": "tasks_get"
  },
  {
    "name": "list",
    "namespace": "tasks",
    "description": "Get all tasks.",
    "method": "GET",
    "path": "/_tasks",
    "namespaceFile": "tasks_list"
  },
  {
    "name": "terms-enum",
    "namespace": null,
    "description": "Get terms in an index.",
    "method": "GET",
    "path": "/{index}/_terms_enum",
    "namespaceFile": "terms_enum"
  },
  {
    "name": "termvectors",
    "namespace": null,
    "description": "Get term vector information.",
    "method": "GET",
    "path": "/{index}/_termvectors/{id}",
    "namespaceFile": "termvectors"
  },
  {
    "name": "find-field-structure",
    "namespace": "text-structure",
    "description": "Find the structure of a text field.",
    "method": "GET",
    "path": "/_text_structure/find_field_structure",
    "namespaceFile": "text_structure_find_field_structure"
  },
  {
    "name": "find-message-structure",
    "namespace": "text-structure",
    "description": "Find the structure of text messages.",
    "method": "GET",
    "path": "/_text_structure/find_message_structure",
    "namespaceFile": "text_structure_find_message_structure"
  },
  {
    "name": "find-structure",
    "namespace": "text-structure",
    "description": "Find the structure of a text file.",
    "method": "POST",
    "path": "/_text_structure/find_structure",
    "namespaceFile": "text_structure_find_structure",
    "bodyFormat": "ndjson"
  },
  {
    "name": "test-grok-pattern",
    "namespace": "text-structure",
    "description": "Test a Grok pattern.",
    "method": "GET",
    "path": "/_text_structure/test_grok_pattern",
    "namespaceFile": "text_structure_test_grok_pattern"
  },
  {
    "name": "delete-transform",
    "namespace": "transform",
    "description": "Delete a transform.",
    "method": "DELETE",
    "path": "/_transform/{transform_id}",
    "namespaceFile": "transform_delete_transform"
  },
  {
    "name": "get-node-stats",
    "namespace": "transform",
    "description": "Get node stats.",
    "method": "GET",
    "path": "/_transform/_node_stats",
    "namespaceFile": "transform_get_node_stats"
  },
  {
    "name": "get-transform",
    "namespace": "transform",
    "description": "Get transforms.",
    "method": "GET",
    "path": "/_transform/{transform_id}",
    "namespaceFile": "transform_get_transform"
  },
  {
    "name": "get-transform-stats",
    "namespace": "transform",
    "description": "Get transform stats.",
    "method": "GET",
    "path": "/_transform/{transform_id}/_stats",
    "namespaceFile": "transform_get_transform_stats"
  },
  {
    "name": "preview-transform",
    "namespace": "transform",
    "description": "Preview a transform.",
    "method": "GET",
    "path": "/_transform/{transform_id}/_preview",
    "namespaceFile": "transform_preview_transform"
  },
  {
    "name": "put-transform",
    "namespace": "transform",
    "description": "Create a transform.",
    "method": "PUT",
    "path": "/_transform/{transform_id}",
    "namespaceFile": "transform_put_transform"
  },
  {
    "name": "reset-transform",
    "namespace": "transform",
    "description": "Reset a transform.",
    "method": "POST",
    "path": "/_transform/{transform_id}/_reset",
    "namespaceFile": "transform_reset_transform"
  },
  {
    "name": "schedule-now-transform",
    "namespace": "transform",
    "description": "Schedule a transform to start now.",
    "method": "POST",
    "path": "/_transform/{transform_id}/_schedule_now",
    "namespaceFile": "transform_schedule_now_transform"
  },
  {
    "name": "set-upgrade-mode",
    "namespace": "transform",
    "description": "Set upgrade_mode for transform indices.",
    "method": "POST",
    "path": "/_transform/set_upgrade_mode",
    "namespaceFile": "transform_set_upgrade_mode"
  },
  {
    "name": "start-transform",
    "namespace": "transform",
    "description": "Start a transform.",
    "method": "POST",
    "path": "/_transform/{transform_id}/_start",
    "namespaceFile": "transform_start_transform"
  },
  {
    "name": "stop-transform",
    "namespace": "transform",
    "description": "Stop transforms.",
    "method": "POST",
    "path": "/_transform/{transform_id}/_stop",
    "namespaceFile": "transform_stop_transform"
  },
  {
    "name": "update-transform",
    "namespace": "transform",
    "description": "Update a transform.",
    "method": "POST",
    "path": "/_transform/{transform_id}/_update",
    "namespaceFile": "transform_update_transform"
  },
  {
    "name": "upgrade-transforms",
    "namespace": "transform",
    "description": "Upgrade all transforms.",
    "method": "POST",
    "path": "/_transform/_upgrade",
    "namespaceFile": "transform_upgrade_transforms"
  },
  {
    "name": "update",
    "namespace": null,
    "description": "Update a document.",
    "method": "POST",
    "path": "/{index}/_update/{id}",
    "namespaceFile": "update"
  },
  {
    "name": "update-by-query",
    "namespace": null,
    "description": "Update documents.",
    "method": "POST",
    "path": "/{index}/_update_by_query",
    "namespaceFile": "update_by_query"
  },
  {
    "name": "update-by-query-rethrottle",
    "namespace": null,
    "description": "Throttle an update by query operation.",
    "method": "POST",
    "path": "/_update_by_query/{task_id}/_rethrottle",
    "namespaceFile": "update_by_query_rethrottle"
  },
  {
    "name": "ack-watch",
    "namespace": "watcher",
    "description": "Acknowledge a watch.",
    "method": "PUT",
    "path": "/_watcher/watch/{watch_id}/_ack/{action_id}",
    "namespaceFile": "watcher_ack_watch"
  },
  {
    "name": "activate-watch",
    "namespace": "watcher",
    "description": "Activate a watch.",
    "method": "PUT",
    "path": "/_watcher/watch/{watch_id}/_activate",
    "namespaceFile": "watcher_activate_watch"
  },
  {
    "name": "deactivate-watch",
    "namespace": "watcher",
    "description": "Deactivate a watch.",
    "method": "PUT",
    "path": "/_watcher/watch/{watch_id}/_deactivate",
    "namespaceFile": "watcher_deactivate_watch"
  },
  {
    "name": "delete-watch",
    "namespace": "watcher",
    "description": "Delete a watch.",
    "method": "DELETE",
    "path": "/_watcher/watch/{id}",
    "namespaceFile": "watcher_delete_watch"
  },
  {
    "name": "execute-watch",
    "namespace": "watcher",
    "description": "Run a watch.",
    "method": "PUT",
    "path": "/_watcher/watch/{id}/_execute",
    "namespaceFile": "watcher_execute_watch"
  },
  {
    "name": "get-settings",
    "namespace": "watcher",
    "description": "Get Watcher index settings.",
    "method": "GET",
    "path": "/_watcher/settings",
    "namespaceFile": "watcher_get_settings"
  },
  {
    "name": "get-watch",
    "namespace": "watcher",
    "description": "Get a watch.",
    "method": "GET",
    "path": "/_watcher/watch/{id}",
    "namespaceFile": "watcher_get_watch"
  },
  {
    "name": "put-watch",
    "namespace": "watcher",
    "description": "Create or update a watch.",
    "method": "PUT",
    "path": "/_watcher/watch/{id}",
    "namespaceFile": "watcher_put_watch"
  },
  {
    "name": "query-watches",
    "namespace": "watcher",
    "description": "Query watches.",
    "method": "GET",
    "path": "/_watcher/_query/watches",
    "namespaceFile": "watcher_query_watches"
  },
  {
    "name": "start",
    "namespace": "watcher",
    "description": "Start the watch service.",
    "method": "POST",
    "path": "/_watcher/_start",
    "namespaceFile": "watcher_start"
  },
  {
    "name": "stats",
    "namespace": "watcher",
    "description": "Get Watcher statistics.",
    "method": "GET",
    "path": "/_watcher/stats/{metric}",
    "namespaceFile": "watcher_stats"
  },
  {
    "name": "stop",
    "namespace": "watcher",
    "description": "Stop the watch service.",
    "method": "POST",
    "path": "/_watcher/_stop",
    "namespaceFile": "watcher_stop"
  },
  {
    "name": "update-settings",
    "namespace": "watcher",
    "description": "Update Watcher index settings.",
    "method": "PUT",
    "path": "/_watcher/settings",
    "namespaceFile": "watcher_update_settings"
  },
  {
    "name": "info",
    "namespace": "xpack",
    "description": "Get information.",
    "method": "GET",
    "path": "/_xpack",
    "namespaceFile": "xpack_info"
  },
  {
    "name": "usage",
    "namespace": "xpack",
    "description": "Get usage information.",
    "method": "GET",
    "path": "/_xpack/usage",
    "namespaceFile": "xpack_usage"
  }
] as const
