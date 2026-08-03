/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Saved Object type name for the cluster-global record of a plugin's deferred (lazy)
 * Elasticsearch initialization state. One document per plugin id, keyed by plugin id.
 *
 * Owned (registered + mapped) by `@kbn/core-saved-objects-server-internal`; read and
 * written by `@kbn/core-plugins-server-internal`.
 */
export const DEFERRED_INIT_STATE_TYPE = 'core-deferred-init-state';
