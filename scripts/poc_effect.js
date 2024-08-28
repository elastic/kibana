/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

require('../src/setup_node_env');
require('@kbn/test-suites-xpack/api_integration/apis/es/use_some_random');
require('@kbn/test-suites-xpack/api_integration/apis/es/effect_provide_svc_multiple_times');
require('@kbn/test-suites-xpack/api_integration/apis/es/effect_provide_mulitple_svcs_via_context');
