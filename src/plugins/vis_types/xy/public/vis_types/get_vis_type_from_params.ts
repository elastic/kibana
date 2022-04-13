/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { VisParams } from 'src/plugins/visualizations/common';

export const getVisTypeFromParams = (params?: VisParams) => {
  let type = params?.seriesParams?.[0]?.type;
  if (type === 'histogram' && ['left', 'right'].includes(params?.categoryAxes?.[0]?.position)) {
    type = 'horizontal_bar';
  }
  return type;
};
