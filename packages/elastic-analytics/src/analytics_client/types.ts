/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { Observable } from 'rxjs';

// If we are going to export this to a separate NPM module in the future,
// we'll need to revisit this import.
import type { Logger } from '@kbn/logging';

import type { IShipper } from '../shippers';
import type { EventContext, TelemetryCounter } from '../events';
import type { RootSchema } from '../schema';

/**
 * General settings of the analytics client
 */
export interface AnalyticsClientInitContext {
  /**
   * Boolean indicating if it's running in developer mode.
   */
  isDev: boolean;
  /**
   * Specify if the shippers should send their data to the production or staging environments.
   */
  sendTo: 'production' | 'staging';
  /**
   * Application-provided logger.
   */
  logger: Logger;
}

/**
 * Constructor of a {@link IShipper}
 */
export interface ShipperClassConstructor<Shipper extends IShipper, Config> {
  /**
   * The shipper's unique name
   */
  shipperName: string;

  /**
   * The constructor
   * @param config The shipper's custom config
   * @param initContext Common context {@link AnalyticsClientInitContext}
   */
  new (config: Config, initContext: AnalyticsClientInitContext): Shipper;
}

/**
 * Optional options to register a shipper
 */
export interface RegisterShipperOpts {
  /**
   * List of event types that will be received only by this shipper.
   * @deprecated
   * @internal Set as internal and deprecated until we come up with the best design for this.
   * Not in the scope of the initial MVP.
   */
  exclusiveEventTypes?: string[];
}

/**
 * Shipper Name used for indexed structures. Only used to improve the readability of the types
 */
export type ShipperName = string;
/**
 * Event Type used for indexed structures. Only used to improve the readability of the types
 */
export type EventType = string;

/**
 * Sets whether a type of event is enabled/disabled globally or per shipper.
 */
export interface OptInConfigPerType {
  /**
   * The event type is globally enabled.
   */
  enabled: boolean;
  /**
   * Controls if an event type should be disabled for a specific type of shipper.
   * @example If the event type is automatically tracked by ShipperA, the config would look like:
   * ```
   * {
   *   enabled: true,
   *   shippers: {
   *     ShipperA: false
   *   }
   * }
   * ```
   */
  shippers?: Record<ShipperName, boolean | undefined>;
}

/**
 *
 */
export interface OptInConfig {
  /**
   * Controls the global enabled/disabled behaviour of the client and shippers.
   */
  global: OptInConfigPerType;
  /**
   * Controls if an event type should be disabled for a specific type of shipper.
   * @example If "clicks" are automatically tracked by ShipperA, the config would look like:
   * ```
   * {
   *   global: { enabled: true },
   *   event_types: {
   *     click: {
   *       enabled: true,
   *       shippers: {
   *         ShipperA: false
   *       }
   *     }
   *   }
   * }
   * ```
   */
  event_types?: Record<EventType, OptInConfigPerType | undefined>;
}

/**
 * Definition of a context provider
 */
export interface ContextProviderOpts<Context extends Partial<EventContext>> {
  /**
   * Observable that emits the custom context.
   */
  context$: Observable<Context>;
  /**
   * Schema declaring and documenting the expected output in the context$
   *
   * @remark During development, it may be used to validate the provided values.
   */
  schema: RootSchema<Context>;
}

/**
 * Definition of an Event Type.
 */
export interface EventTypeOpts<EventTypeData> {
  /**
   * The event type's unique name.
   */
  eventType: string;
  /**
   * Schema declaring and documenting the expected structure of this event type.
   *
   * @remark During development, it may be used to validate the provided values.
   */
  schema: RootSchema<EventTypeData>;
}

/**
 * Analytics client's public APIs
 */
export interface IAnalyticsClient {
  /**
   * Reports a telemetry event.
   * @param eventType The event type registered via the `registerEventType` API.
   * @param eventData The properties matching the schema declared in the `registerEventType` API.
   */
  reportEvent: <EventTypeData extends Record<string, unknown>>(
    eventType: EventType,
    eventData: EventTypeData
  ) => void;
  /**
   * Registers the event type that will be emitted via the reportEvent API.
   * @param eventTypeOps
   */
  registerEventType: <EventTypeData>(eventTypeOps: EventTypeOpts<EventTypeData>) => void;

  /**
   * Set up the shipper that will be used to report the telemetry events.
   * @param Shipper The {@link IShipper} class to instantiate the shipper.
   * @param shipperConfig The config specific to the Shipper to instantiate.
   * @param opts Additional options to register the shipper {@link RegisterShipperOpts}.
   */
  registerShipper: <Shipper extends IShipper, ShipperConfig>(
    Shipper: ShipperClassConstructor<Shipper, ShipperConfig>,
    shipperConfig: ShipperConfig,
    opts?: RegisterShipperOpts
  ) => void;
  /**
   * Used to control the user's consent to report the data.
   * In the advanced mode, it allows to "cherry-pick" which events and shippers are enabled/disabled.
   * @param optInConfig {@link OptInConfig}
   */
  optIn: (optInConfig: OptInConfig) => void;
  /**
   * Registers the context provider to enrich the any reported events.
   * @param contextProviderOpts {@link ContextProviderOpts}
   */
  registerContextProvider: <Context>(contextProviderOpts: ContextProviderOpts<Context>) => void;
  /**
   * Observable to emit the stats of the processed events.
   */
  readonly telemetryCounter$: Observable<TelemetryCounter>;
}
