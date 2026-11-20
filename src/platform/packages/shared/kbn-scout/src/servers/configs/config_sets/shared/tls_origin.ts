/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Url from 'url';
import { defaultConfig } from '../default/stateful/base.config';

/**
 * Origin of the Kibana server for config sets served over TLS (`configureHTTP2`).
 *
 * Tests that pin client certificates to an origin, or navigate by absolute URL, must agree with
 * the host and port the server is actually bound to, so derive both from the server config
 * rather than repeating them.
 */
export const KIBANA_TLS_ORIGIN = Url.format({
  protocol: 'https',
  hostname: defaultConfig.servers.kibana.hostname,
  port: defaultConfig.servers.kibana.port,
});
