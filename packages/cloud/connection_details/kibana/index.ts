/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export {
  KibanaConnectionDetailsProvider,
  type KibanaConnectionDetailsProviderProps,
} from './kibana_connection_details_provider';
export { setGlobalDependencies } from './global';
export {
  KibanaWiredConnectionDetailsProvider,
  type KibanaWiredConnectionDetailsProviderProps,
} from './kibana_wired_connection_details_provider';
export { openConnectionDetails, type OpenConnectionDetailsParams } from './open_connection_details';
export {
  openWiredConnectionDetails,
  type OpenWiredConnectionDetailsParams,
} from './open_wired_connection_details';
