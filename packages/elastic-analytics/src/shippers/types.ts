/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Observable } from 'rxjs';
import { Event, EventContext, TelemetryCounter } from '../events';

/**
 * Basic structure of a Shipper
 */
export interface IShipper {
  /**
   * Adapts and ships the event to the persisting/analytics solution.
   * @param events batched events {@link Event}
   */
  reportEvents: (events: Event[]) => void;
  /**
   * Stops/restarts the shipping mechanism based on the value of isOptedIn
   * @param isOptedIn `true` for resume sending events. `false` to stop.
   */
  optIn: (isOptedIn: boolean) => void;
  /**
   * Perform any necessary calls to the persisting/analytics solution to set the event's context.
   * @param newContext
   */
  extendContext?: (newContext: EventContext) => void;
  /**
   * Observable to emit the stats of the processed events.
   */
  telemetryCounter$?: Observable<TelemetryCounter>;
  /**
   * Shutdown the shipper.
   */
  shutdown: () => void;
}
