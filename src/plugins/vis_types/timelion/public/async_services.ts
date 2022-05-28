/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

// re-export async parts from a single file to not create separate asyn bundles
export { getTimelionRequestHandler } from './helpers/timelion_request_handler';
export { TimelionVisComponent } from './components/timelion_vis_component';
