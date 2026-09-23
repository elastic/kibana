/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Temporary CI merge gate: connector `metadata.id` values allowed to declare
 * `ConnectorSpec.events`.
 *
 * This is not a runtime registry. While inbound events are still being built
 * (kill switch `xpack.actions.inboundEvents.enabled` defaults to false), an
 * empty/explicit allowlist prevents drive-by specs from opting into the
 * inbound surface just because the type exists.
 *
 * Sunset: once phase-1 inbound events are working and events are generally
 * available, delete this set and rely on code review, the kill switch, and
 * route authz. "Accept whatever specs define" is the intended end state.
 */
export const SPECS_ALLOWED_EVENTS = new Set<string>(['.inboundWebhook']);
