/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { tags } from '@kbn/scout';

/**
 * Default tags for Discover core / platform specs that should run across all
 * stateful + serverless deployment types.
 */
export const DISCOVER_CORE_TAGS = tags.deploymentAgnostic;

/**
 * Tags for Discover specs that only make sense on stateful deployments
 * (self-managed + Elastic Cloud hosted, classic + ESS). Use this for specs
 * migrated from FTR `src/platform/test/functional/apps/discover/**`, which
 * extend `config.base.js` and rely on the `logstash_functional` / `hamlet`
 * ES archives, the `discover` kbn archive, and `security.testUser` custom
 * roles — none of which are available on serverless / MKI projects.
 */
export const DISCOVER_STATEFUL_TAGS = tags.stateful.all;

/**
 * Standard `kbn_archiver/discover` archive. Loads the `logstash-*` data view
 * and the other saved objects most Discover specs rely on.
 */
export const DISCOVER_KBN_ARCHIVE = 'src/platform/test/functional/fixtures/kbn_archiver/discover';

export const DEFAULT_DATA_VIEW = 'logstash-*';

/**
 * Default time range that covers the `logstash_functional` fixture data.
 * Matches the FTR `timePicker.setDefaultAbsoluteRangeViaUiSettings()` values.
 */
export const DEFAULT_TIME_RANGE = {
  from: '2015-09-19T06:31:44.000Z',
  to: '2015-09-23T18:31:44.000Z',
};
