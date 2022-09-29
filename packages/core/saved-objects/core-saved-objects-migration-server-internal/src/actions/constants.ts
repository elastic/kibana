/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/**
 * Batch size for updateByQuery and reindex operations.
 * Uses the default value of 1000 for Elasticsearch reindex operation.
 */
export const BATCH_SIZE = 1_000;
/**
 * When a request takes a long time to complete and hits the timeout or the
 * client aborts that request due to the requestTimeout, our only course of
 * action is to retry that request. This places our request at the end of the
 * queue and adds more load to Elasticsearch just making things worse.
 *
 * So we want to choose as long a timeout as possible. Some load balancers /
 * reverse proxies like ELB ignore TCP keep-alive packets so unless there's a
 * request or response sent over the socket it will be dropped after 60s.
 */
export const DEFAULT_TIMEOUT = '60s';
/** Allocate 1 replica if there are enough data nodes, otherwise continue with 0 */
export const INDEX_AUTO_EXPAND_REPLICAS = '0-1';
/** ES rule of thumb: shards should be several GB to 10's of GB, so Kibana is unlikely to cross that limit */
export const INDEX_NUMBER_OF_SHARDS = 1;
/** Wait for all shards to be active before starting an operation */
export const WAIT_FOR_ALL_SHARDS_TO_BE_ACTIVE = 'all';
