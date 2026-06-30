/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Keep in sync with workflows_management/server/trigger_events_log/*.
 * This local copy avoids a server-side dependency from execution_engine to
 * workflows_management while still allowing rollover checks during startup.
 */
export const WORKFLOWS_EVENTS_DATA_STREAM = '.workflows-events';

export const WORKFLOWS_EVENTS_MANAGED_INDEX_MAPPINGS_VERSION = 3;
