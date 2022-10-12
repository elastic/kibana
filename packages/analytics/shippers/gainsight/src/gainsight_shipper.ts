/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type {
  AnalyticsClientInitContext,
  EventContext,
  Event,
  IShipper,
} from '@kbn/analytics-client';
import type { GainSightApi } from './types';
import type { GainSightSnippetConfig } from './load_snippet';
import { formatPayload } from './format_payload';
import { loadSnippet } from './load_snippet';

/**
 * gainSight shipper.
 */
export class GainSightShipper implements IShipper {
  /** Shipper's unique name */
  public static shipperName = 'Gainsight';

  private readonly gainSightApi: GainSightApi;

  /**
   * Creates a new instance of the gainSightShipper.
   * @param config {@link GainSightSnippetConfig}
   * @param initContext {@link AnalyticsClientInitContext}
   */
  constructor(
    config: GainSightSnippetConfig,
    private readonly initContext: AnalyticsClientInitContext
  ) {
    const { ...snippetConfig } = config;
    this.gainSightApi = loadSnippet(snippetConfig);
  }

  /**
   * Calls track or set on the fields provided in the newContext.
   * @param newContext The full new context to set {@link EventContext}
   */
  public extendContext(newContext: EventContext): void {
    this.initContext.logger.debug(`Received context ${JSON.stringify(newContext)}`);

    // gainSight requires different APIs for different type of contexts.
    const { userId, cluster_name: clusterName } = newContext;

    // Call it only when the userId changes
    if (userId && clusterName) {
      this.initContext.logger.debug(`Calling identify with userId ${userId}`);
      // We need to call the API for every new userId (restarting the session).
      this.gainSightApi('identify', {
        id: clusterName,
        userType: 'deployment',
      });
      this.gainSightApi('set', 'globalContext', {
        kibanaUserId: userId,
      });
    } else {
      this.initContext.logger.debug(
        `Identify has already been called with ${userId} and ${clusterName}`
      );
    }
  }

  /**
   * Stops/restarts the shipping mechanism based on the value of isOptedIn
   * @param isOptedIn `true` for resume sending events. `false` to stop.
   */
  public optIn(isOptedIn: boolean): void {
    this.initContext.logger.debug(`Setting gainsight to optIn ${isOptedIn}`);

    if (isOptedIn) {
      this.gainSightApi('config', 'enableTag', true);
    } else {
      this.gainSightApi('config', 'enableTag', false);
    }
  }

  /**
   * Transforms the event into a valid format and calls `track`.
   * @param events batched events {@link Event}
   */
  public reportEvents(events: Event[]): void {
    this.initContext.logger.debug(`Reporting ${events.length} events to gainsight`);
    events.forEach((event) => {
      // We only read event.properties and discard the rest because the context is already sent in the other APIs.
      this.gainSightApi('track', event.event_type, formatPayload(event.properties));
    });
  }

  /**
   * Shuts down the shipper.
   * It doesn't really do anything inside because this shipper doesn't hold any internal queues.
   */
  public shutdown() {
    // No need to do anything here for now.
  }
}
