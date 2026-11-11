/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Bounds of one `_bulk` request in `bulkInstallManagedWorkflows`. Each request goes to the index's
 * one shard and holds one `system_write` thread until its refresh, so a pass never holds more than
 * one.
 */
export const MANAGED_INSTALL_BULK_MAX_DOCUMENTS = 50;
export const MANAGED_INSTALL_BULK_MAX_BYTES = 2 * 1024 * 1024;
