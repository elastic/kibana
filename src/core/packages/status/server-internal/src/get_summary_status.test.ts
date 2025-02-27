/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ServiceStatus, ServiceStatusLevels } from '@kbn/core-status-common';
import { getSummaryStatus } from './get_summary_status';
import { PluginStatus } from './types';

describe('getSummaryStatus', () => {
  const availableService: ServiceStatus = {
    level: ServiceStatusLevels.available,
    summary: 'Available',
  };
  const degradedService: ServiceStatus = {
    level: ServiceStatusLevels.degraded,
    summary: 'This is degraded!',
  };
  const criticalService: ServiceStatus = {
    level: ServiceStatusLevels.critical,
    summary: 'This is critical!',
  };
  const availablePluginA: PluginStatus = {
    level: ServiceStatusLevels.available,
    summary: 'A is available',
    reported: true,
  };
  const unavailablePluginA: PluginStatus = {
    level: ServiceStatusLevels.unavailable,
    summary: 'A is unavailable!',
    reported: true,
  };
  const availablePluginB: PluginStatus = {
    level: ServiceStatusLevels.available,
    summary: 'B is available',
    reported: true,
  };
  const unavailablePluginB: PluginStatus = {
    level: ServiceStatusLevels.unavailable,
    summary: 'B is unavailable!',
    reported: true,
  };
  const unavailablePluginC: PluginStatus = {
    level: ServiceStatusLevels.unavailable,
    summary: 'C is unavailable!',
    // Note that C has an inferred status
  };

  it('returns available when all status are available', () => {
    expect(
      getSummaryStatus({
        serviceStatuses: { elasticsearch: availableService, savedObjects: availableService },
        pluginStatuses: { a: availablePluginA, b: availablePluginB },
      })
    ).toMatchInlineSnapshot(`
      Object {
        "level": "available",
        "summary": "All services and plugins are available",
      }
    `);
  });

  it('returns degraded when the worst status is degraded', () => {
    expect(
      getSummaryStatus({
        serviceStatuses: { elasticsearch: degradedService, savedObjects: availableService },
        pluginStatuses: { a: availablePluginA, b: availablePluginB },
      })
    ).toMatchInlineSnapshot(`
      Object {
        "detail": "See the status page for more information",
        "level": "degraded",
        "meta": Object {
          "affectedPlugins": Array [],
          "failingPlugins": Array [],
          "failingServices": Array [
            "elasticsearch",
          ],
        },
        "summary": "1 service(s) and 0 plugin(s) are degraded: elasticsearch",
      }
    `);
  });

  it('returns unavailable when the worst status is unavailable', () => {
    expect(
      getSummaryStatus({
        serviceStatuses: { elasticsearch: degradedService, savedObjects: availableService },
        pluginStatuses: { a: unavailablePluginA, b: unavailablePluginB, c: unavailablePluginC },
      })
    ).toMatchInlineSnapshot(`
      Object {
        "detail": "See the status page for more information",
        "level": "unavailable",
        "meta": Object {
          "affectedPlugins": Array [
            "c",
          ],
          "failingPlugins": Array [
            "a",
            "b",
          ],
          "failingServices": Array [],
        },
        "summary": "0 service(s) and 2 plugin(s) are unavailable: a, b",
      }
    `);
  });

  it('returns critical when the worst status is critical', () => {
    expect(
      getSummaryStatus({
        serviceStatuses: { elasticsearch: degradedService, savedObjects: criticalService },
        pluginStatuses: { a: availablePluginA, b: unavailablePluginB },
      })
    ).toMatchInlineSnapshot(`
      Object {
        "detail": "See the status page for more information",
        "level": "critical",
        "meta": Object {
          "affectedPlugins": Array [],
          "failingPlugins": Array [],
          "failingServices": Array [
            "savedObjects",
          ],
        },
        "summary": "1 service(s) and 0 plugin(s) are critical: savedObjects",
      }
    `);
  });
});
