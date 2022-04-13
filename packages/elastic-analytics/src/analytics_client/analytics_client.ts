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
  ContextProviderName,
  ContextProviderOpts,
  EventTypeOpts,
  IAnalyticsClient,
  OptInConfig,
  RegisterShipperOpts,
  ShipperClassConstructor,
} from './types';
import type { Event, EventContext, EventType, TelemetryCounter } from '../events';
import { TelemetryCounterType } from '../events';
import { ShippersRegistry } from './shippers_registry';
import { OptInConfigService } from './opt_in_config';
import { ContextService } from './context_service';

export class AnalyticsClient implements IAnalyticsClient {
  private readonly internalTelemetryCounter$ = new Subject<TelemetryCounter>();
  public readonly telemetryCounter$: Observable<TelemetryCounter> =
    this.internalTelemetryCounter$.pipe(share()); // Using `share` so we can have multiple subscribers
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
  private readonly contextService: ContextService;
  private readonly context$ = new BehaviorSubject<Partial<EventContext>>({});
  private readonly optInConfig$ = new BehaviorSubject<OptInConfigService | undefined>(undefined);
  private readonly optInConfigWithReplay$ = this.optInConfig$.pipe(
    filter((optInConfig): optInConfig is OptInConfigService => typeof optInConfig !== 'undefined'),
    shareReplay(1)
  );
  private readonly contextWithReplay$ = this.context$.pipe(
    skipWhile(() => !this.optInConfig$.value), // Do not forward the context events until we have an optInConfig value
    shareReplay(1)
  );

  constructor(private readonly initContext: AnalyticsClientInitContext) {
    this.contextService = new ContextService(this.context$, this.initContext.isDev);
    this.reportEnqueuedEventsWhenClientIsReady();
  }

  public reportEvent = <EventTypeData extends Record<string, unknown>>(
    eventType: EventType,
    eventData: EventTypeData
  ) => {
    // Fetch the timestamp as soon as we receive the event.
    const timestamp = new Date().toISOString();

    this.internalTelemetryCounter$.next({
      type: TelemetryCounterType.enqueued,
      source: 'client',
      event_type: eventType,
      code: 'enqueued',
      count: 1,
    });

    if (!this.eventTypeRegistry.get(eventType)) {
      this.internalTelemetryCounter$.next({
        type: TelemetryCounterType.dropped,
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

    if (optInConfig?.isEventTypeOptedIn(eventType) === false) {
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
      this.sendToShipper(eventType, [event]);
    }
  };

  public registerEventType = <EventTypeData>(eventTypeOps: EventTypeOpts<EventTypeData>) => {
    if (this.eventTypeRegistry.get(eventTypeOps.eventType)) {
      throw new Error(`Event Type "${eventTypeOps.eventType}" is already registered.`);
    }
    this.eventTypeRegistry.set(eventTypeOps.eventType, eventTypeOps);
  };

  public optIn = (optInConfig: OptInConfig) => {
    const optInConfigInstance = new OptInConfigService(optInConfig);
    this.optInConfig$.next(optInConfigInstance);
  };

  public registerContextProvider = <Context>(contextProviderOpts: ContextProviderOpts<Context>) => {
    this.contextService.registerContextProvider(contextProviderOpts);
  };

  public removeContextProvider = (name: ContextProviderName) => {
    this.contextService.removeContextProvider(name);
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
      const isOptedIn = optInConfig.isShipperOptedIn(shipperName);
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

  public shutdown = () => {
    this.shippersRegistry.allShippers.forEach((shipper) => shipper.shutdown());
    this.internalEventQueue$.complete();
    this.internalTelemetryCounter$.complete();
    this.shipperRegistered$.complete();
    this.optInConfig$.complete();
    this.context$.complete();
  };

  /**
   * Forwards the `events` to the registered shippers, bearing in mind if the shipper is opted-in for that eventType.
   * @param eventType The event type's name
   * @param events A bulk array of events matching the eventType.
   * @private
   */
  private sendToShipper(eventType: EventType, events: Event[]) {
    let sentToShipper = false;
    this.shippersRegistry.getShippersForEventType(eventType).forEach((shipper, shipperName) => {
      const isShipperOptedIn = this.optInConfig$.value?.isShipperOptedIn(shipperName, eventType);

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
        type: TelemetryCounterType.sent_to_shipper,
        source: 'client',
        event_type: eventType,
        code: 'OK',
        count: events.length,
      });
    }
  }

  /**
   * Once the client is ready (it has a valid optInConfig and at least one shipper),
   * flush any early events and ship them or discard them based on the optInConfig.
   * @private
   */
  private reportEnqueuedEventsWhenClientIsReady() {
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
          if (this.optInConfig$.value?.isOptedIn()) {
            this.context$.next(this.context$.value);
          }
        }),

        // Minimal delay only to make this chain async and let
        // the context update operation to complete first.
        delay(0),

        // Flatten the array of events
        concatMap((events) => from(events)),

        // Discard opted-out events
        filter((event) => this.optInConfig$.value?.isEventTypeOptedIn(event.event_type) === true),

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
        this.sendToShipper(eventType, events);
      });
  }
}
