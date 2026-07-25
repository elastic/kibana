/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { OpenAPIV3 } from 'openapi-types';
import { getStabilityFromXState } from './get_stability_from_x_state';

const operationWithXState = (xState: string): OpenAPIV3.OperationObject =>
  ({
    responses: {},
    'x-state': xState,
  } as OpenAPIV3.OperationObject);

describe('getStabilityFromXState', () => {
  it('maps Technical Preview to tech_preview', () => {
    expect(getStabilityFromXState(operationWithXState('Technical Preview'))).toBe('tech_preview');
  });

  it('maps Experimental to experimental', () => {
    expect(getStabilityFromXState(operationWithXState('Experimental'))).toBe('experimental');
  });

  it('maps legacy Beta x-state to experimental', () => {
    expect(getStabilityFromXState(operationWithXState('Beta'))).toBe('experimental');
  });

  it('returns undefined when x-state is missing', () => {
    expect(getStabilityFromXState({ responses: {} })).toBeUndefined();
  });
});
