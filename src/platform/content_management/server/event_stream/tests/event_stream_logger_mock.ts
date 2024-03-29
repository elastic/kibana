/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { EventStreamLogger } from '../types';

export class EventStreamLoggerMock implements EventStreamLogger {
  public debug = jest.fn();
  public info = jest.fn();
  public warn = jest.fn();
  public error = jest.fn();
}
