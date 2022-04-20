/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Subject } from 'rxjs';
import type { IShipper } from './types';
import type { TelemetryCounter } from '../events';

function createShipper(): jest.Mocked<IShipper> {
  return new MockedShipper();
}

class MockedShipper implements IShipper {
  public static shipperName = 'mocked-shipper';

  constructor() {}

  public optIn = jest.fn();
  public reportEvents = jest.fn();
  public extendContext = jest.fn();
  public telemetryCounter$ = new Subject<TelemetryCounter>();
}

export const shippersMock = {
  createShipper,
  MockedShipper,
};
