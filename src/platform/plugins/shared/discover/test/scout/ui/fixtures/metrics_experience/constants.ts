/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { tags } from '@kbn/scout';

export const METRICS_TEST_INDEX_NAME = 'test-metrics-experience';

export const ESQL_QUERIES = {
  TS: `TS ${METRICS_TEST_INDEX_NAME}`,
  FROM: `FROM ${METRICS_TEST_INDEX_NAME}`,
};

export const DATA_VIEW_NAME = METRICS_TEST_INDEX_NAME;

export const KBN_ARCHIVE =
  'src/platform/plugins/shared/discover/test/scout/ui/fixtures/metrics_experience/kbn_archives/metrics_data_view.json';

export const METRICS_EXPERIENCE_TAGS = [
  ...tags.stateful.all,
  ...tags.serverless.observability.complete,
];
