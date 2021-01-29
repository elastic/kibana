/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { utc } from 'moment';
import type { ReqFacade } from '../../search_strategies';
import type { VisPayload } from '../../../../common/types';

export const getTimerange = (req: ReqFacade<VisPayload>) => {
  const { min, max } = req.payload.timerange;

  return {
    from: utc(min),
    to: utc(max),
  };
};
