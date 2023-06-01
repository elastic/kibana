/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { setStateToKbnUrl } from '@kbn/kibana-utils-plugin/public';

import type { SetStateToKbnUrlHashOptions } from '@kbn/kibana-utils-plugin/common/state_management/set_state_to_kbn_url';
import { DiscoverAppLocatorDefinitionCommon } from '../common/locator';
export const DISCOVER_APP_LOCATOR = 'DISCOVER_APP_LOCATOR';

export class DiscoverAppLocatorDefinitionPublic extends DiscoverAppLocatorDefinitionCommon {
  public setStateToKbnUrl = <State>(
    key: string,
    state: State,
    hashOptions: SetStateToKbnUrlHashOptions,
    rawUrl: string
  ): string => {
    return setStateToKbnUrl<State>(key, state, hashOptions, rawUrl);
  };
}
