/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DiscoverSessionTabAttributes } from '@kbn/saved-search-plugin/server';
import type { DiscoverSessionApiTab } from '../schema';

type StoredVisContext = DiscoverSessionTabAttributes['visContext'];
type ApiVisContext = DiscoverSessionApiTab['vis_context'];

export interface StoredVisContextRequestData {
  dataViewId?: string;
  timeField?: string;
  timeInterval?: string;
  breakdownField?: string;
}

export { getDiscoverSessionVisContext as transformVisContextOut } from '../../../common/api/converters';

export const transformVisContextIn = (
  visContext: ApiVisContext,
  requestData: StoredVisContextRequestData = {}
): StoredVisContext => {
  if (!visContext) {
    return undefined;
  }

  return {
    suggestionType: visContext.suggestion_type,
    requestData,
    attributes: visContext.attributes,
  };
};
