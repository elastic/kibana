/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { setStateToKbnUrl } from '@kbn/kibana-utils-plugin/public';
import type { DiscoverAppLocatorParams } from '../../common';
import { appLocatorGetLocationCommon } from '../../common/app_locator_get_location';
import type { ProfileStateRegistry } from '../../common/context_awareness';

export const appLocatorGetLocation = (
  {
    useHash,
    profileStateRegistry,
  }: {
    useHash: boolean;
    profileStateRegistry: ProfileStateRegistry;
  },
  params: DiscoverAppLocatorParams
) => appLocatorGetLocationCommon({ useHash, setStateToKbnUrl, profileStateRegistry }, params);

export { contextAppLocatorGetLocation } from '../application/context/services/locator_get_location';
export { singleDocLocatorGetLocation } from '../application/doc/locator_get_location';
export { esqlLocatorGetLocation } from '../../common/esql_locator_get_location';
