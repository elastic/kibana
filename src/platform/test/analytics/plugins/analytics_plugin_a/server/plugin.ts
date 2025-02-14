/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { BehaviorSubject, filter, firstValueFrom, ReplaySubject } from 'rxjs';
import { takeWhile, tap, toArray } from 'rxjs';
import { schema } from '@kbn/config-schema';
import type { Plugin, CoreSetup, CoreStart, TelemetryCounter, Event } from '@kbn/core/server';
import type { Action } from './custom_shipper';
import { CustomShipper } from './custom_shipper';

export class AnalyticsPluginAPlugin implements Plugin {
  public setup({ analytics, http }: CoreSetup, deps: {}) {
    const {
      registerContextProvider,
      registerEventType,
      registerShipper,
      reportEvent,
      telemetryCounter$,
    } = analytics;

    const stats: TelemetryCounter[] = [];
    telemetryCounter$.subscribe((event) => stats.push(event));

    registerEventType({
      eventType: 'test-plugin-lifecycle',
      schema: {
        plugin: {
          type: 'keyword',
          _meta: {
            description: 'The ID of the plugin',
          },
        },
        step: {
          type: 'keyword',
          _meta: {
            description: 'The lifecycle step in which the plugin is',
          },
        },
      },
    });

    // Report an event before the shipper is registered
    reportEvent('test-plugin-lifecycle', {
      plugin: 'analyticsPluginA',
      step: 'setup',
    });

    const actions$ = new ReplaySubject<Action>();
    registerShipper(CustomShipper, actions$);

    const router = http.createRouter();

    router.get(
      {
        path: '/internal/analytics_plugin_a/stats',
        validate: {
          query: schema.object({
            takeNumberOfCounters: schema.number({ min: 1 }),
            eventType: schema.string(),
          }),
        },
      },
      async (context, req, res) => {
        const { takeNumberOfCounters, eventType } = req.query;

        return res.ok({
          body: stats
            .filter(
              (counter) =>
                counter.event_type === eventType &&
                ['client', 'FTR-shipper'].includes(counter.source)
            )
            .slice(-takeNumberOfCounters),
        });
      }
    );

    router.get(
      {
        path: '/internal/analytics_plugin_a/actions',
        validate: false,
      },
      async (context, req, res) => {
        let found = false;
        const actions = await firstValueFrom(
          actions$.pipe(
            takeWhile(() => !found),
            tap((action) => {
              found = isTestPluginLifecycleReportEventAction(action);
            }),
            // Filter only the actions that are relevant to this plugin
            filter(
              ({ action, meta }) =>
                ['optIn', 'extendContext'].includes(action) ||
                isTestPluginLifecycleReportEventAction({ action, meta })
            ),
            toArray()
          )
        );
        return res.ok({ body: actions });
      }
    );

    registerContextProvider({
      name: 'analyticsPluginA',
      context$: new BehaviorSubject({ pid: process.pid }),
      schema: {
        pid: {
          type: 'short',
          _meta: {
            description: 'The Kibana process ID',
          },
        },
      },
    });
  }

  public start({ analytics }: CoreStart) {
    analytics.reportEvent('test-plugin-lifecycle', {
      plugin: 'analyticsPluginA',
      step: 'start',
    });
  }

  public stop() {}
}

function isTestPluginLifecycleReportEventAction({ action, meta }: Action): boolean {
  return (
    action === 'reportEvents' &&
    meta.find((event: Event) => event.event_type === 'test-plugin-lifecycle')
  );
}
