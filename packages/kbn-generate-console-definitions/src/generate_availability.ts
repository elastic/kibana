/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EndpointDescription } from '@kbn/console-plugin/common/types';
import { SpecificationTypes } from './types';

/**
 * Types important for this logic:
 * export class Endpoint {
 *   ...
 *   availability: Availabilities
 * }
 * export class Availabilities {
 *   stack?: Availability
 *   serverless?: Availability
 * }
 * export class Availability {
 *   ...
 *   visibility?: Visibility
 * }
 * export enum Visibility {
 *   public = 'public',
 *   feature_flag = 'feature_flag',
 *   private = 'private'
 * }
 *
 * The property `availability` is required in the endpoint object according to types.
 * Its properties `stack` and `serverless` are independent of each other.
 *   - If `stack` or `serverless` property is missing in `availability`, the endpoint is NOT available there.
 *   - If `stack` or `serverless` property is present
 *     - If `visibility` is missing, its `public` by default -> the endpoint is available.
 *     - If `visibility` is set to any value other than `public`-> the endpoint is not available.
 */

const DEFAULT_ENDPOINT_AVAILABILITY = true;

// if the availability object is present, check the visibility property:
// if visibility is missing, it's public by default -> available;
// if visibility is set, anything other than public means not available
export const isAvailabilityPublic = (
  availability: SpecificationTypes.Availability | undefined
): boolean =>
  Boolean(
    availability &&
      (!availability.visibility || availability.visibility === SpecificationTypes.Visibility.public)
  );

export const generateAvailability = (
  endpoint: SpecificationTypes.Endpoint
): EndpointDescription['availability'] => {
  const availability: EndpointDescription['availability'] = {
    stack: DEFAULT_ENDPOINT_AVAILABILITY,
    serverless: DEFAULT_ENDPOINT_AVAILABILITY,
  };
  // availability is a required property of the endpoint
  if (!endpoint.availability) {
    throw new Error('missing availability for ' + endpoint.name);
  }
  // if no availability object for stack, the endpoint is not available there
  if (!endpoint.availability.stack) {
    availability.stack = false;
  } else {
    availability.stack = isAvailabilityPublic(endpoint.availability.stack);
  }
  // the same logic for serverless

  // if no availability object for serverless, the endpoint is not available there
  if (!endpoint.availability.serverless) {
    availability.serverless = false;
  } else {
    availability.serverless = isAvailabilityPublic(endpoint.availability.serverless);
  }
  return availability;
};
