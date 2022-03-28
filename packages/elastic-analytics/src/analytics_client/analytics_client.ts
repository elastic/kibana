/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { Observable } from 'rxjs';
import { BehaviorSubject, Subject, combineLatest, from } from 'rxjs';
import {
  buffer,
  bufferCount,
  concatMap,
  delay,
  filter,
  groupBy,
  map,
  mergeMap,
  share,
  shareReplay,
  skipWhile,
  takeUntil,
  tap,
} from 'rxjs/operators';
import type { IShipper } from '../shippers';
import type {
  AnalyticsClientInitContext,
  ContextProviderOpts,
  EventType,
  EventTypeOpts,
  IAnalyticsClient,
  OptInConfig,
  RegisterShipperOpts,
  ShipperClassConstructor,
} from './types';
import type { Event, EventContext, TelemetryCounter } from '../events';
import type { OptInConfigPerType } from './types';
import { ShippersRegistry } from './shippers_registry';

export class AnalyticsClient implements IAnalyticsClient {
  public readonly telemetryCounter$: Observable<TelemetryCounter>;
  private readonly internalTelemetryCounter$ = new Subject<TelemetryCounter>();
  /**
   * This queue holds all the events until both conditions occur:
   * 1. We know the user's optIn decision.
   * 2. We have, at least, one registered shipper.
   * @private
   */
  private readonly internalEventQueue$ = new Subject<Event>();
  private readonly shippersRegistry = new ShippersRegistry();
  /**
   * Observable used to report when a shipper is registered.
   * @private
   */
  private readonly shipperRegistered$ = new Subject<void>();
  private readonly eventTypeRegistry = new Map<EventType, EventTypeOpts<unknown>>();
  private readonly context$ = new BehaviorSubject<Partial<EventContext>>({});
  private readonly contextProvidersRegistry = new Map<
    Observable<Partial<EventContext>>,
    Partial<EventContext>
  >();
  private readonly optInConfig$ = new BehaviorSubject<OptInConfig | undefined>(undefined);
  private readonly optInConfigWithReplay$ = this.optInConfig$.pipe(
    filter((optInConfig): optInConfig is OptInConfig => typeof optInConfig !== 'undefined'),
    shareReplay(1)
  );
  private readonly contextWithReplay$ = this.context$.pipe(
    skipWhile(() => !this.optInConfig$.value), // Do not forward the context events until we have an optInConfig value
    shareReplay(1)
  );

  constructor(private readonly initContext: AnalyticsClientInitContext) {
    this.telemetryCounter$ = this.internalTelemetryCounter$.pipe(share()); // Using `share` so we can have multiple subscribers

    // Observer that will emit when both events occur: the OptInConfig is set + a shipper has been registered
    const configReceivedAndShipperReceivedObserver$ = combineLatest([
      this.optInConfigWithReplay$,
      this.shipperRegistered$,
    ]);

    // Flush the internal queue when we get any optInConfig and, at least, 1 shipper
    this.internalEventQueue$
      .pipe(
        // Take until will close the observer once we reach the condition below
        takeUntil(configReceivedAndShipperReceivedObserver$),

        // Accumulate the events until we can send them
        buffer(configReceivedAndShipperReceivedObserver$),

        // Minimal delay only to make this chain async and let the optIn operation to complete first.
        delay(0),

        // Re-emit the context to make sure all the shippers got it (only if opted-in)
        tap(() => {
          if (this.optInConfig$.value?.global.enabled) {
            this.context$.next(this.context$.value);
          }
        }),

        // Minimal delay only to make this chain async and let
        // the context update operation to complete first.
        delay(0),

        // Flatten the array of events
        concatMap((events) => from(events)),

        // Discard opted-out events
        filter((event) => {
          const optInConfig = this.optInConfig$.value;
          const isGloballyOptedIn = optInConfig?.global.enabled === true;
          const eventIsNotOptedOut =
            (optInConfig?.event_types &&
              // Checking it's not `false` because if a shipper is not explicitly specified, we assume opted-in based on the global state
              optInConfig.event_types[event.event_type]?.enabled !== false) ??
            true;
          return isGloballyOptedIn && eventIsNotOptedOut;
        }),

        // Let's group the requests per eventType for easier batching
        groupBy((event) => event.event_type),
        mergeMap((groupedObservable) =>
          groupedObservable.pipe(
            bufferCount(1000), // Batching up-to 1000 events per event type for backpressure reasons
            map((events) => ({ eventType: groupedObservable.key, events }))
          )
        )
      )
      .subscribe(({ eventType, events }) => {
        const eventTypeOptInConfig =
          this.optInConfig$.value?.event_types && this.optInConfig$.value?.event_types[eventType];
        this.sendToShipper(eventType, events, eventTypeOptInConfig);
      });
  }

  public reportEvent = <EventTypeData extends Record<string, unknown>>(
    eventType: EventType,
    eventData: EventTypeData
  ) => {
    // Fetch the timestamp as soon as we receive the event.
    const timestamp = new Date().toISOString();

    this.internalTelemetryCounter$.next({
      type: 'enqueued',
      source: 'client',
      event_type: eventType,
      code: 'enqueued',
      count: 1,
    });

    if (!this.eventTypeRegistry.get(eventType)) {
      this.internalTelemetryCounter$.next({
        type: 'dropped',
        source: 'client',
        event_type: eventType,
        code: 'UnregisteredType',
        count: 1,
      });
      throw new Error(
        `Attempted to report event type "${eventType}", before registering it. Use the "registerEventType" API to register it.`
      );
    }

    if (this.initContext.isDev) {
      // TODO: In the future we may need to validate the eventData based on the eventType's registered schema (only if isDev)
    }

    const optInConfig = this.optInConfig$.value;
    const eventTypeOptInConfig = optInConfig?.event_types && optInConfig?.event_types[eventType];

    if (optInConfig?.global.enabled === false || eventTypeOptInConfig?.enabled === false) {
      // If opted out, skip early
      return;
    }

    const event: Event = {
      timestamp,
      event_type: eventType,
      context: this.context$.value,
      properties: eventData,
    };

    if (typeof optInConfig === 'undefined') {
      // If the opt-in config is not provided yet, we need to enqueue the event to an internal queue
      this.internalEventQueue$.next(event);
    } else {
      this.sendToShipper(eventType, [event], eventTypeOptInConfig);
    }
  };

  public registerEventType = <EventTypeData>(eventTypeOps: EventTypeOpts<EventTypeData>) => {
    if (this.eventTypeRegistry.get(eventTypeOps.eventType)) {
      throw new Error(`Event Type "${eventTypeOps.eventType}" is already registered.`);
    }
    this.eventTypeRegistry.set(eventTypeOps.eventType, eventTypeOps);
  };

  public optIn = (optInConfig: OptInConfig) => {
    this.optInConfig$.next(optInConfig);
  };

  public registerContextProvider = <Context>(contextProviderOpts: ContextProviderOpts<Context>) => {
    contextProviderOpts.context$
      .pipe(
        tap((ctx) => {
          if (this.initContext.isDev) {
            // TODO: In the future we may need to validate the input of the context based on the schema (only if isDev)
          }
        })
      )
      .subscribe({
        next: (ctx) => {
          // We store each context linked to the context provider so they can increase and reduce
          // the number of fields they report without having left-overs in the global context.
          this.contextProvidersRegistry.set(contextProviderOpts.context$, ctx);

          // For every context change, we rebuild the global context.
          // It's better to do it here than to rebuild it for every reportEvent.
          this.updateGlobalContext();
        },
        complete: () => {
          // Delete the context provider from the registry when the observable completes
          this.contextProvidersRegistry.delete(contextProviderOpts.context$);
          this.updateGlobalContext();
        },
      });
  };

  public registerShipper = <Shipper extends IShipper, ShipperConfig>(
    ShipperClass: ShipperClassConstructor<Shipper, ShipperConfig>,
    shipperConfig: ShipperConfig,
    { exclusiveEventTypes = [] }: RegisterShipperOpts = {}
  ) => {
    const shipperName = ShipperClass.shipperName;
    const shipper = new ShipperClass(shipperConfig, {
      ...this.initContext,
      logger: this.initContext.logger.get('shipper', shipperName),
    });
    if (exclusiveEventTypes.length) {
      // This feature is not intended to be supported in the MVP.
      // I can remove it if we think it causes more bad than good.
      exclusiveEventTypes.forEach((eventType) => {
        this.shippersRegistry.addEventExclusiveShipper(eventType, shipperName, shipper);
      });
    } else {
      this.shippersRegistry.addGlobalShipper(shipperName, shipper);
    }

    // Subscribe to the shipper's telemetryCounter$ and pass it over to the client's-level observable
    shipper.telemetryCounter$?.subscribe((counter) =>
      this.internalTelemetryCounter$.next({
        ...counter,
        source: shipperName, // Enforce the shipper's name in the `source`
      })
    );

    // Spread the optIn configuration updates
    this.optInConfigWithReplay$.subscribe((optInConfig) => {
      const isShipperExplicitlyOptedIn =
        (optInConfig.global.shippers && optInConfig.global.shippers[shipperName]) ?? true;
      const isOptedIn = optInConfig.global.enabled && isShipperExplicitlyOptedIn;
      try {
        shipper.optIn(isOptedIn);
      } catch (err) {
        this.initContext.logger.warn(
          `Failed to set isOptedIn:${isOptedIn} in shipper ${shipperName}`,
          err
        );
      }
    });

    // Spread the global context if it has custom extendContext method
    if (shipper.extendContext) {
      this.contextWithReplay$.subscribe((context) => {
        try {
          shipper.extendContext!(context);
        } catch (err) {
          this.initContext.logger.warn(
            `Shipper "${shipperName}" failed to extend the context`,
            err
          );
        }
      });
    }

    // Notify that a shipper is registered
    this.shipperRegistered$.next();
  };

  /**
   * Forwards the `events` to the registered shippers, bearing in mind if the shipper is opted-in for that eventType.
   * @param eventType The event type's name
   * @param events A bulk array of events matching the eventType.
   * @param eventTypeOptInConfig The optIn config for the sepecific eventType.
   * @private
   */
  private sendToShipper(
    eventType: EventType,
    events: Event[],
    eventTypeOptInConfig?: OptInConfigPerType
  ) {
    let sentToShipper = false;
    this.shippersRegistry.getShippersForEventType(eventType).forEach((shipper, shipperName) => {
      const isShipperOptedIn =
        ((this.optInConfig$.value?.global.shippers &&
          this.optInConfig$.value.global.shippers[shipperName]) ??
          true) &&
        ((eventTypeOptInConfig?.shippers && eventTypeOptInConfig.shippers[shipperName]) ?? true);

      // Only send it to the non-explicitly opted-out shippers
      if (isShipperOptedIn) {
        sentToShipper = true;
        try {
          shipper.reportEvents(events);
        } catch (err) {
          this.initContext.logger.warn(
            `Failed to report event "${eventType}" via shipper "${shipperName}"`,
            err
          );
        }
      }
    });
    if (sentToShipper) {
      this.internalTelemetryCounter$.next({
        type: 'sent_to_shipper',
        source: 'client',
        event_type: eventType,
        code: 'OK',
        count: events.length,
      });
    }
  }

  /**
   * Loops through all the context providers and sets the global context
   * @private
   */
  private updateGlobalContext() {
    this.context$.next(
      [...this.contextProvidersRegistry.values()].reduce((acc, context) => {
        return {
          ...acc,
          ...context,
        };
      }, {} as Partial<EventContext>)
    );
  }
}
