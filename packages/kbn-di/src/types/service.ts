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

/**
 * Represent a service label. Service labels are not unique, meaning
 * that multiple service can have the same label(s). The injection containers
 * can retrieve all services matching a given label, and provide them as a list
 * during injection.
 */
export type ServiceLabel<ServiceType = unknown> = string | symbol;

/**
 * The scope of a service
 * - global: the service will be instantiated once at the root for the whole container chain.
 * - container: the service will be instantiated at the level of the container that requested it.
 */
export type ServiceScope = 'global' | 'container';
