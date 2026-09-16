/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/** Shared by both manual-configuration suites (with and without TLS). */
export const CONFIGURE_ROUTE = '/internal/interactive_setup/configure';

/** Name shared by the enrollment API keys the enrollment suites create and invalidate. */
export const ENROLLMENT_API_KEY_NAME = 'enrollment_api_key';

/**
 * Credentials interactive setup should store for Kibana to reach Elasticsearch with. These are
 * *payload data*, not the identity the tests run as — interactive setup is unauthenticated.
 *
 * Mirrors `kibanaServerTestUser` from `@kbn/test` and Scout's own
 * `servers.elasticsearch.{username,password}`, neither of which is reachable from a spec: Scout's
 * `config` fixture only exposes `auth` (the Kibana `elastic` user), and `elastic` is explicitly
 * rejected by the setup form as a Kibana system user.
 */
export const KIBANA_SYSTEM_USER = {
  username: process.env.TEST_KIBANA_SERVER_USER || 'kibana_system',
  password: process.env.TEST_KIBANA_SERVER_PASS || 'changeme',
};

/**
 * How long to wait for the wizard to accept a submission and navigate away. Interactive setup
 * rewrites Kibana's config and restarts it, so this is inherently slow.
 */
export const SETUP_COMPLETION_TIMEOUT_MS = 150_000;

/** How long to wait for Kibana to come back up once it has been configured. */
export const KIBANA_BOOT_TIMEOUT_MS = 90_000;

/**
 * Overall budget for a spec, which has to exceed the sum of the waits above — Scout's default is
 * 60s, and a test that times out mid-wait reports the timeout instead of the real failure.
 */
export const SETUP_SPEC_TIMEOUT_MS = SETUP_COMPLETION_TIMEOUT_MS + KIBANA_BOOT_TIMEOUT_MS + 60_000;
