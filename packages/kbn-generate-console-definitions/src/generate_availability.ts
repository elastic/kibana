/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { EndpointDescription } from '@kbn/console-plugin/common/types';
import type { SpecificationTypes } from './types';

const DEFAULT_ENDPOINT_AVAILABILITY = true;

export const generateAvailability = (
  endpoint: SpecificationTypes.Endpoint
): EndpointDescription['availability'] => {
  const availability: EndpointDescription['availability'] = {
    stack: DEFAULT_ENDPOINT_AVAILABILITY,
    serverless: DEFAULT_ENDPOINT_AVAILABILITY,
  };
  if (endpoint.availability.stack?.visibility) {
    availability.stack = endpoint.availability.stack?.visibility === 'public';
  }
  if (endpoint.availability.serverless?.visibility) {
    availability.serverless = endpoint.availability.serverless?.visibility === 'public';
  }
  return availability;
};
