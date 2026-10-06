/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ServerOptions as TLSOptions } from 'https';
import type { ISslConfig } from './types';
/**
 * Converts Kibana `SslConfig` into `TLSOptions` that are accepted by the Hapi server,
 * and by https.Server.setSecureContext()
 */
export declare function getServerTLSOptions(ssl: ISslConfig): TLSOptions | undefined;
