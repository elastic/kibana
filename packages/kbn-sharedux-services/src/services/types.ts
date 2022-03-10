/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/**
 * A factory function for creating one or more services.
 *
 * The `S` generic determines the shape of the API being produced.
 * The `Parameters` generic determines what parameters are expected to
 * create the service.
 */
export type ServiceFactory<S, Parameters = void> = (params: Parameters) => S;
