/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { formatGenericFeature } from './common';
import { PluginFeature } from './feature';
import { formatHttpRouteFeature } from './http_route';

export const formatFeature = (feature: PluginFeature) => {
  if (feature.type === 'http-route') {
    return formatHttpRouteFeature(feature);
  } else {
    return formatGenericFeature(feature);
  }
};
