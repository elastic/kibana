/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/**
 * Represent a unique identifier for a registered service.
 *
 * The `ServiceType` generic type can be used to specify and then infer the type of the service associated with the Id.
 */
export type ServiceIdentifier<ServiceType = unknown> = string | symbol;
