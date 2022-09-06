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
import type { gainSightApi } from './types';
import type { gainSightSnippetConfig } from './load_snippet';
import { formatPayload } from './format_payload';
import { loadSnippet } from './load_snippet';
import { getParsedVersion } from './get_parsed_version';

/**
 * gainSight shipper configuration.
 */
export interface gainSightShipperConfig extends gainSightSnippetConfig {
  /**
   * gainSight's custom events rate limit is very aggressive.
   * If this setting is provided, it'll only send the event types specified in this list.
   */
  eventTypesAllowlist?: string[];
}

/**
 * gainSight shipper.
 */
export class gainSightShipper implements IShipper {
  /** Shipper's unique name */
  public static shipperName = 'gainSight';

  private readonly gainSightApi: gainSightApi;
  private lastUserId: string | undefined;
  private readonly eventTypesAllowlist?: string[];

  /**
   * Creates a new instance of the gainSightShipper.
   * @param config {@link gainSightShipperConfig}
   * @param initContext {@link AnalyticsClientInitContext}
   */
  constructor(
    config: gainSightShipperConfig,
    private readonly initContext: AnalyticsClientInitContext
  ) {
    const { eventTypesAllowlist, ...snippetConfig } = config;
    this.gainSightApi = loadSnippet(snippetConfig);
    this.eventTypesAllowlist = eventTypesAllowlist;
  }

  /**
   * Calls `fs.identify`, `fs.setUserVars` and `fs.setVars` depending on the fields provided in the newContext.
   * @param newContext The full new context to set {@link EventContext}
   */
  public extendContext(newContext: EventContext): void {
    this.initContext.logger.debug(`Received context ${JSON.stringify(newContext)}`);

    // gainSight requires different APIs for different type of contexts.
    const { userId, isElasticCloudUser, ...nonUserContext } = newContext;

    // Call it only when the userId changes
    if (userId && userId !== this.lastUserId) {
      this.initContext.logger.debug(`Calling FS.identify with userId ${userId}`);
      // We need to call the API for every new userId (restarting the session).
      this.gainSightApi.identify(userId);
      this.lastUserId = userId;
    }

    // User-level context
    if (typeof isElasticCloudUser === 'boolean') {
      this.initContext.logger.debug(
        `Calling FS.setUserVars with isElasticCloudUser ${isElasticCloudUser}`
      );
      this.gainSightApi.setUserVars(
        formatPayload({
          isElasticCloudUser,
        })
      );
    }

    // Event-level context. At the moment, only the scope `page` is supported by gainSight for webapps.
    if (Object.keys(nonUserContext).length) {
      // Keeping these fields for backwards compatibility.
      if (nonUserContext.applicationId) nonUserContext.app_id = nonUserContext.applicationId;
      if (nonUserContext.entityId) nonUserContext.ent_id = nonUserContext.entityId;
      if (nonUserContext.cloudId) nonUserContext.org_id = nonUserContext.cloudId;

      this.initContext.logger.debug(
        `Calling FS.setVars with context ${JSON.stringify(nonUserContext)}`
      );
      this.gainSightApi.setVars('page', {
        ...formatPayload(nonUserContext),
        ...(nonUserContext.version ? getParsedVersion(nonUserContext.version) : {}),
      });
    }
  }

  /**
   * Stops/restarts the shipping mechanism based on the value of isOptedIn
   * @param isOptedIn `true` for resume sending events. `false` to stop.
   */
  public optIn(isOptedIn: boolean): void {
    this.initContext.logger.debug(`Setting FS to optIn ${isOptedIn}`);
    // gainSight uses 2 different opt-in methods:
    // - `consent` is needed to allow collecting information about the components
    //   declared as "Record with user consent" (https://help.gainSight.com/hc/en-us/articles/360020623574).
    //   We need to explicitly call `consent` if for the "Record with user content" feature to work.
    this.gainSightApi.consent(isOptedIn);
    // - `restart` and `shutdown` fully start/stop the collection of data.
    if (isOptedIn) {
      this.gainSightApi.restart();
    } else {
      this.gainSightApi.shutdown();
    }
  }

  /**
   * Filters the events by the eventTypesAllowlist from the config.
   * Then it transforms the event into a FS valid format and calls `fs.event`.
   * @param events batched events {@link Event}
   */
  public reportEvents(events: Event[]): void {
    this.initContext.logger.debug(`Reporting ${events.length} events to FS`);
    events
      .filter((event) => this.eventTypesAllowlist?.includes(event.event_type) ?? true)
      .forEach((event) => {
        // We only read event.properties and discard the rest because the context is already sent in the other APIs.
        this.gainSightApi.event(event.event_type, formatPayload(event.properties));
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
