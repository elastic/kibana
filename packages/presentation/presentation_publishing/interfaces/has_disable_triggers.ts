/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { apiHasParentApi } from './has_parent_api';

export interface HasDisableTriggers {
  disableTriggers: boolean;
}

export const apiHasDisableTriggers = (api: unknown | null): api is HasDisableTriggers => {
  return Boolean(api && typeof (api as HasDisableTriggers).disableTriggers === 'boolean');
};

export function areTriggersDisabled(api?: unknown) {
  function getDisabledTriggers(thisApi?: unknown) {
    return apiHasDisableTriggers(thisApi) ? thisApi.disableTriggers : false;
  }

  return (
    getDisabledTriggers(api) ||
    getDisabledTriggers(apiHasParentApi(api) ? api.parentApi : undefined)
  );
}
