/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { Serializable } from '@kbn/utility-types';
import { omitBy } from 'lodash';
import type { ParsedQuery } from 'query-string';
import { stringify } from 'query-string';
import rison from 'rison-node';
import { isFilterPinned } from '@kbn/es-query';
import { url } from '@kbn/kibana-utils-plugin/common';
import { GLOBAL_STATE_STORAGE_KEY, STATE_STORAGE_KEY, VisualizeConstants } from './constants';
import type { VisualizeLocatorParams } from './locator';

const removeEmptyKeys = (o: Record<string, Serializable>): Record<string, Serializable> =>
  omitBy(o, (v) => v == null);

export async function getLocation({
  visId,
  timeRange,
  filters,
  refreshInterval,
  linked,
  uiState,
  query,
  vis,
  savedSearchId,
  indexPattern,
}: VisualizeLocatorParams) {
  let path = visId
    ? `#${VisualizeConstants.EDIT_PATH}/${visId}`
    : `#${VisualizeConstants.CREATE_PATH}`;

  const urlState: ParsedQuery = {
    [GLOBAL_STATE_STORAGE_KEY]: rison.encode(
      removeEmptyKeys({
        time: timeRange,
        filters: filters?.filter((f) => isFilterPinned(f)),
        refreshInterval,
      })
    ),
    [STATE_STORAGE_KEY]: rison.encode(
      removeEmptyKeys({
        linked,
        filters: filters?.filter((f) => !isFilterPinned(f)),
        uiState,
        query,
        vis,
      })
    ),
  };

  path += `?${stringify(url.encodeQuery(urlState), { encode: false, sort: false })}`;

  const otherParams = stringify({ type: vis?.type, savedSearchId, indexPattern });

  if (otherParams) path += `&${otherParams}`;

  return {
    app: VisualizeConstants.APP_ID,
    path,
    state: {},
  };
}
