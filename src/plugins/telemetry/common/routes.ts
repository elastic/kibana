/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const BASE_INTERNAL_PATH = '/internal/telemetry';

export const INTERNAL_VERSION = { version: '2' };

/**
 * Fetch Telemetry Config
 * @public Kept public and path-based because we know other Elastic products fetch the opt-in status via this endpoint.
 */
export const FetchTelemetryConfigRoutePathBasedV2 = '/api/telemetry/v2/config';

/**
 * Fetch Telemetry Config
 * @internal
 */
export const FetchTelemetryConfigRoute = `${BASE_INTERNAL_PATH}/config`;

/**
 * GET/PUT Last reported date for Snapshot telemetry
 * @internal
 */
export const LastReportedRoute = `${BASE_INTERNAL_PATH}/last_reported`;

/**
 * Set user has seen notice
 * @internal
 */
export const UserHasSeenNoticeRoute = `${BASE_INTERNAL_PATH}/userHasSeenNotice`;

/**
 * Set opt-in/out status
 * @internal
 */
export const OptInRoute = `${BASE_INTERNAL_PATH}/optIn`;

/**
 * Fetch the Snapshot telemetry report
 * @internal
 */
export const FetchSnapshotTelemetry = `${BASE_INTERNAL_PATH}/clusters/_stats`;

/**
 * Get Opt-in stats
 * @internal
 * @deprecated
 */
export const GetOptInStatsRoutePathBasedV2 = '/api/telemetry/v2/clusters/_opt_in_stats';
