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
import type { GainsightApi } from './types';
import type { GainsightSnippetConfig } from './load_snippet';
import { loadSnippet } from './load_snippet';

/**
 * gainsight shipper.
 */
export class GainsightShipper implements IShipper {
  /** Shipper's unique name */
  public static shipperName = 'Gainsight';
  private lastClusterName: string | undefined;
  private readonly gainsightApi: GainsightApi;

  /**
   * Creates a new instance of the gainsightShipper.
   * @param config {@link GainsightSnippetConfig}
   * @param initContext {@link AnalyticsClientInitContext}
   */
  constructor(
    config: GainsightSnippetConfig,
    private readonly initContext: AnalyticsClientInitContext
  ) {
    const { ...snippetConfig } = config;
    this.gainsightApi = loadSnippet(snippetConfig);
  }

  /**
   * Calls track or set on the fields provided in the newContext.
   * @param newContext The full new context to set {@link EventContext}
   */
  public extendContext(newContext: EventContext): void {
    this.initContext.logger.debug(`Received context ${JSON.stringify(newContext)}`);

    // gainsight requires different APIs for different type of contexts.
    const { userId, cluster_name: clusterName } = newContext;

    this.gainsightApi('set', 'globalContext', {
      kibanaUserId: userId,
    });

    if (clusterName && clusterName !== this.lastClusterName) {
      this.initContext.logger.debug(`Calling identify with userId ${userId}`);
      // We need to call the API for every new userId (restarting the session).
      this.gainsightApi('identify', {
        id: clusterName,
        userType: 'deployment',
      });
      this.lastClusterName = clusterName;
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
      this.gainsightApi('config', 'enableTag', true);
    } else {
      this.gainsightApi('config', 'enableTag', false);
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
      this.gainsightApi('track', event.event_type, event.properties);
    });
  }

  /**
   * Flushes all internal queues of the shipper.
   * It doesn't really do anything inside because this shipper doesn't hold any internal queues.
   */
  public async flush() {}

  /**
   * Shuts down the shipper.
   * It doesn't really do anything inside because this shipper doesn't hold any internal queues.
   */
  public shutdown() {
    // No need to do anything here for now.
  }
}
