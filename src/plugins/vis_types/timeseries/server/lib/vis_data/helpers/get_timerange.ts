/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { utc } from 'moment';
import type { VisTypeTimeseriesVisDataRequest } from '../../../types';

export const getTimerange = (req: VisTypeTimeseriesVisDataRequest) => {
  const { min, max } = req.body.timerange;

  return {
    from: utc(min),
    to: utc(max),
  };
};
