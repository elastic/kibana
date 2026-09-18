/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Kibana is started with a small `elasticsearch.maxResponseSize` so that a handful of large documents
 * is enough to make a detection rule search response exceed the limit
 * (`security_solution/test/scout_es_max_response_size`).
 */
export const ELASTICSEARCH_MAX_RESPONSE_SIZE_BYTES = 10 * 1024 * 1024;

export const esMaxResponseSizeServerArgs = [
  `--elasticsearch.maxResponseSize=${ELASTICSEARCH_MAX_RESPONSE_SIZE_BYTES}b`,
];
