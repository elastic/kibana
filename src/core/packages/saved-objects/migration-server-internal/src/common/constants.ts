/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export const CLUSTER_SHARD_LIMIT_EXCEEDED_REASON = `[cluster_shard_limit_exceeded] Upgrading Kibana requires adding a small number of new shards. Ensure that Kibana is able to add 10 more shards by increasing the cluster.max_shards_per_node setting, or removing indices to clear up resources.`;

export const FATAL_REASON_REQUEST_ENTITY_TOO_LARGE = `While indexing a batch of saved objects, Elasticsearch returned a 413 Request Entity Too Large exception. Ensure that the Kibana configuration option 'migrations.maxBatchSizeBytes' is set to a value that is lower than or equal to the Elasticsearch 'http.max_content_length' configuration option.`;
