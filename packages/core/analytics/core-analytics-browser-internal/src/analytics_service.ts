/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { of } from 'rxjs';
import type { AnalyticsClient } from '@kbn/analytics-client';
import { createAnalytics } from '@kbn/analytics-client';
import { registerPerformanceMetricEventType } from '@kbn/ebt-tools';
import type { CoreContext } from '@kbn/core-base-browser-internal';
import type { InternalInjectedMetadataSetup } from '@kbn/core-injected-metadata-browser-internal';
import type { AnalyticsServiceSetup, AnalyticsServiceStart } from '@kbn/core-analytics-browser';
import { trackClicks } from './track_clicks';
import { getSessionId } from './get_session_id';
import { createLogger } from './logger';

/** @internal */
export interface AnalyticsServiceSetupDeps {
  injectedMetadata: InternalInjectedMetadataSetup;
}

export class AnalyticsService {
  private readonly analyticsClient: AnalyticsClient;

  constructor(core: CoreContext) {
    this.analyticsClient = createAnalytics({
      isDev: core.env.mode.dev,
      logger: createLogger(core.env.mode.dev),
      // TODO: We need to be able to edit sendTo once we resolve the telemetry config.
      //  For now, we are relying on whether it's a distributable or running from source.
      sendTo: core.env.packageInfo.dist ? 'production' : 'staging',
    });

    this.registerBuildInfoAnalyticsContext(core);
    registerPerformanceMetricEventType(this.analyticsClient);

    // We may eventually move the following to the client's package since they are not Kibana-specific
    // and can benefit other consumers of the client.
    this.registerSessionIdContext();
    this.registerBrowserInfoAnalyticsContext();
    trackClicks(this.analyticsClient, core.env.mode.dev);
  }

  public setup({ injectedMetadata }: AnalyticsServiceSetupDeps): AnalyticsServiceSetup {
    this.registerElasticsearchInfoContext(injectedMetadata);

    return {
      optIn: this.analyticsClient.optIn,
      registerContextProvider: this.analyticsClient.registerContextProvider,
      removeContextProvider: this.analyticsClient.removeContextProvider,
      registerEventType: this.analyticsClient.registerEventType,
      registerShipper: this.analyticsClient.registerShipper,
      reportEvent: this.analyticsClient.reportEvent,
      telemetryCounter$: this.analyticsClient.telemetryCounter$,
    };
  }

  public start(): AnalyticsServiceStart {
    return {
      optIn: this.analyticsClient.optIn,
      reportEvent: this.analyticsClient.reportEvent,
      telemetryCounter$: this.analyticsClient.telemetryCounter$,
    };
  }

  public stop() {
    this.analyticsClient.shutdown();
  }

  /**
   * Enriches the events with a session_id, so we can correlate them and understand funnels.
   * @private
   */
  private registerSessionIdContext() {
    this.analyticsClient.registerContextProvider({
      name: 'session-id',
      context$: of({ session_id: getSessionId() }),
      schema: {
        session_id: {
          type: 'keyword',
          _meta: { description: 'Unique session ID for every browser session' },
        },
      },
    });
  }

  /**
   * Enriches the event with the build information.
   * @param core The core context.
   * @private
   */
  private registerBuildInfoAnalyticsContext(core: CoreContext) {
    this.analyticsClient.registerContextProvider({
      name: 'build info',
      context$: of({
        isDev: core.env.mode.dev,
        isDistributable: core.env.packageInfo.dist,
        version: core.env.packageInfo.version,
        branch: core.env.packageInfo.branch,
        buildNum: core.env.packageInfo.buildNum,
        buildSha: core.env.packageInfo.buildSha,
      }),
      schema: {
        isDev: {
          type: 'boolean',
          _meta: { description: 'Is it running in development mode?' },
        },
        isDistributable: {
          type: 'boolean',
          _meta: { description: 'Is it running from a distributable?' },
        },
        version: { type: 'keyword', _meta: { description: 'Version of the Kibana instance.' } },
        branch: {
          type: 'keyword',
          _meta: { description: 'Branch of source running Kibana from.' },
        },
        buildNum: { type: 'long', _meta: { description: 'Build number of the Kibana instance.' } },
        buildSha: { type: 'keyword', _meta: { description: 'Build SHA of the Kibana instance.' } },
      },
    });
  }

  /**
   * Enriches events with the current Browser's information
   * @private
   */
  private registerBrowserInfoAnalyticsContext() {
    this.analyticsClient.registerContextProvider({
      name: 'browser info',
      context$: of({
        user_agent: navigator.userAgent,
        preferred_language: navigator.language,
        preferred_languages: navigator.languages,
      }),
      schema: {
        user_agent: {
          type: 'keyword',
          _meta: { description: 'User agent of the browser.' },
        },
        preferred_language: {
          type: 'keyword',
          _meta: { description: 'Preferred language of the browser.' },
        },
        preferred_languages: {
          type: 'array',
          items: {
            type: 'keyword',
            _meta: { description: 'List of the preferred languages of the browser.' },
          },
        },
      },
    });
  }

  /**
   * Enriches the events with the Elasticsearch info (cluster name, uuid and version).
   * @param injectedMetadata The injected metadata service.
   * @private
   */
  private registerElasticsearchInfoContext(injectedMetadata: InternalInjectedMetadataSetup) {
    this.analyticsClient.registerContextProvider({
      name: 'elasticsearch info',
      context$: of(injectedMetadata.getElasticsearchInfo()),
      schema: {
        cluster_name: {
          type: 'keyword',
          _meta: { description: 'The Cluster Name', optional: true },
        },
        cluster_uuid: {
          type: 'keyword',
          _meta: { description: 'The Cluster UUID', optional: true },
        },
        cluster_version: {
          type: 'keyword',
          _meta: { description: 'The Cluster version', optional: true },
        },
      },
    });
  }
}
