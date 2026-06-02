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
 * Deployment-agnostic tags for Discover core / platform specs that should run
 * everywhere: all stateful deployments plus the serverless project types that
 * have a stateful counterpart.
 */
export const DISCOVER_DEPLOYMENT_AGNOSTIC_TAGS = tags.deploymentAgnostic;

/**
 * Stateful-only tags. Use for specs migrated from FTR suites that ran
 * stateful-only, to preserve (not expand) their original coverage.
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
