/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/**
 * exposed temporarily until https://github.com/elastic/kibana/issues/41990 done
 * use *only* to retrieve config values. There is no way to set injected values
 * in the new platform.
 * @public
 * @deprecated
 * @removeBy 8.8.0
 */
export interface InjectedMetadataSetup {
  getInjectedVar: (name: string, defaultValue?: any) => unknown;
}

/**
 * exposed temporarily until https://github.com/elastic/kibana/issues/41990 done
 * use *only* to retrieve config values. There is no way to set injected values
 * in the new platform.
 * @public
 * @deprecated
 * @removeBy 8.8.0
 */
export interface InjectedMetadataStart {
  getInjectedVar: (name: string, defaultValue?: any) => unknown;
}
