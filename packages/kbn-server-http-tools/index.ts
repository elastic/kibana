/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export type { IHttpConfig, ISslConfig, ICorsConfig } from './src/types';
export { createServer } from './src/create_server';
export { defaultValidationErrorHandler } from './src/default_validation_error_handler';
export { getServerListener } from './src/get_listener';
export { getServerOptions } from './src/get_server_options';
export { getServerTLSOptions } from './src/get_tls_options';
export { getRequestId } from './src/get_request_id';
export { setTlsConfig } from './src/set_tls_config';
export { sslSchema, SslConfig } from './src/ssl';
