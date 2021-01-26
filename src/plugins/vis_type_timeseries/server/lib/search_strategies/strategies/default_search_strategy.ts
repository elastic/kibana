/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { AbstractSearchStrategy, ReqFacade } from './abstract_search_strategy';
import { DefaultSearchCapabilities } from '../default_search_capabilities';
import { VisPayload } from '../../../../common/types';

export class DefaultSearchStrategy extends AbstractSearchStrategy {
  name = 'default';

  checkForViability(req: ReqFacade<VisPayload>) {
    return Promise.resolve({
      isViable: true,
      capabilities: new DefaultSearchCapabilities(req),
    });
  }

  async getFieldsForWildcard<TPayload = unknown>(
    req: ReqFacade<TPayload>,
    indexPattern: string,
    capabilities?: unknown
  ) {
    return super.getFieldsForWildcard(req, indexPattern, capabilities);
  }
}
