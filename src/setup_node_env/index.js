/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

// development env setup includes babel/register after the env is initialized
require('./setup_env');

// restore < Node 16 default DNS lookup behavior
require('./dns_ipv4_first');

require('@kbn/babel-register').install();
require('./polyfill');

require('@kbn/security-hardening');
require('reflect-metadata');
