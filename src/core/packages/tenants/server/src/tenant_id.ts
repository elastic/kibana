/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

declare const tenantIdBrand: unique symbol;

/**
 * Identifier of a tenant listed in the tenants file.
 *
 * Only the tenants service creates a `TenantId`, after checking that the tenant exists. Other code
 * reads it, for example from `request.tenantId`, but can't make one up from a string.
 *
 * @public
 */
export type TenantId = string & { readonly [tenantIdBrand]: never };
