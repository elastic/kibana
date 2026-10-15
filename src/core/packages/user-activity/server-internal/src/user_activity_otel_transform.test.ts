/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Attributes, AttributeValue } from '@opentelemetry/api';

import type { OtelAppenderPluginConfig, PluginAppenderConfigType } from '@kbn/core-logging-server';
import {
  applyUserActivityOtelFieldMap,
  shapeUserActivityOtelAppenders,
  USER_ACTIVITY_OTEL_PROMOTE_RESOURCE_ATTRIBUTES,
} from './user_activity_otel_transform';

// Metadata values can be arrays of objects at runtime: the OTel appender flattens `log.meta`
// values into attributes as-is, beyond what the `AttributeValue` type models.
const panelErrors = [
  { panel_id: 'p1', error: 'x' },
  { panel_id: 'p2', error: 'y' },
] as unknown as AttributeValue;

describe('applyUserActivityOtelFieldMap', () => {
  it('adds log.type user_activity', () => {
    const result = applyUserActivityOtelFieldMap({ 'event.action': 'dashboard_view' });

    expect(result['log.type']).toBe('user_activity');
  });

  it('drops message (it duplicates the OTLP body.text)', () => {
    const result = applyUserActivityOtelFieldMap({ message: 'User jdoe viewed dashboard' });

    expect(result).not.toHaveProperty('message');
  });

  it('drops the global service.* meta keys (the resource carries service identity)', () => {
    const result = applyUserActivityOtelFieldMap({
      'service.id': '5b2de169-2785-441b-ae8c-186a1936b17d',
      'service.node.roles': ['ui'],
      'service.state': 'green',
      'service.type': 'kibana',
      'service.version': '9.4.0',
    });

    for (const key of [
      'service.id',
      'service.node.roles',
      'service.state',
      'service.type',
      'service.version',
    ]) {
      expect(result).not.toHaveProperty(key);
    }
  });

  it('passes every other attribute through untouched, including array-valued metadata', () => {
    const result = applyUserActivityOtelFieldMap({
      'event.action': 'dashboard_refresh',
      'event.type': ['access'],
      'kibana.space.id': 'default',
      'user.roles': ['admin', 'editor'],
      'kibana.dashboard.panel_count': 5,
      'kibana.dashboard.errors': panelErrors,
    });

    expect(result['event.action']).toBe('dashboard_refresh');
    expect(result['event.type']).toEqual(['access']);
    expect(result['kibana.space.id']).toBe('default');
    expect(result['user.roles']).toEqual(['admin', 'editor']);
    expect(result['kibana.dashboard.panel_count']).toBe(5);
    expect(result['kibana.dashboard.errors']).toBe(panelErrors);
  });

  it('does not mutate the input attributes', () => {
    const input: Attributes = {
      message: 'User jesuswr viewed dashboard',
      'service.version': '9.4.0',
      'kibana.dashboard.errors': panelErrors,
    };
    applyUserActivityOtelFieldMap(input);

    expect(input).toEqual({
      message: 'User jesuswr viewed dashboard',
      'service.version': '9.4.0',
      'kibana.dashboard.errors': panelErrors,
    });
  });

  it('maps a full dashboard_refresh-shaped record to the user activity field set', () => {
    const result = applyUserActivityOtelFieldMap({
      'log.logger': 'user_activity.event',
      message: 'User sgates performed dashboard_refresh on My Dashboard (dash-1)',
      'event.action': 'dashboard_refresh',
      'event.type': ['access'],
      'event.outcome': 'success',
      'kibana.space.id': 'default',
      'kibana.object.id': 'dash-1',
      'user.name': 'sgates',
      'kibana.dashboard.errors': panelErrors,
      'service.id': '5b2de169-2785-441b-ae8c-186a1936b17d',
      'service.node.roles': ['ui'],
      'service.state': 'green',
      'service.type': 'kibana',
      'service.version': '9.4.0',
    });

    expect(result).toEqual({
      'log.logger': 'user_activity.event',
      'log.type': 'user_activity',
      'event.action': 'dashboard_refresh',
      'event.type': ['access'],
      'event.outcome': 'success',
      'kibana.space.id': 'default',
      'kibana.object.id': 'dash-1',
      'user.name': 'sgates',
      'kibana.dashboard.errors': panelErrors,
    });
  });
});

describe('shapeUserActivityOtelAppenders', () => {
  const otelAppender: OtelAppenderPluginConfig = {
    type: 'otel',
    protocol: 'http',
    url: 'http://collector:4318/v1/logs',
  };

  const shapeSingle = (
    appender: OtelAppenderPluginConfig,
    isServerless: boolean,
    isElasticCloud = false
  ) =>
    shapeUserActivityOtelAppenders(
      new Map([['otel_appender', appender]]),
      isServerless,
      isElasticCloud
    ).get('otel_appender') as OtelAppenderPluginConfig;

  it('applies the user activity transforms to otel appenders', () => {
    const shaped = shapeSingle(otelAppender, true);

    expect(shaped.transformAttributes).toBe(applyUserActivityOtelFieldMap);
    expect(shaped.includeResources).toEqual(['service.name', 'service.type']);
    expect(shaped.promoteResourceAttributes).toEqual(
      USER_ACTIVITY_OTEL_PROMOTE_RESOURCE_ATTRIBUTES
    );
  });

  it('sets service.name to serverless-kibana when serverless', () => {
    const shaped = shapeSingle(otelAppender, true);

    expect(shaped.attributes).toEqual({
      'service.name': 'serverless-kibana',
      'service.type': 'kibana',
    });
  });

  it('sets service.name to self-managed-kibana when not serverless', () => {
    const shaped = shapeSingle(otelAppender, false);

    expect(shaped.attributes).toEqual({
      'service.name': 'self-managed-kibana',
      'service.type': 'kibana',
    });
  });

  it('sets service.name to hosted-kibana when not serverless on Elastic Cloud', () => {
    const shaped = shapeSingle(otelAppender, false, true);

    expect(shaped.attributes).toEqual({
      'service.name': 'hosted-kibana',
      'service.type': 'kibana',
    });
  });

  it('keeps serverless-kibana when serverless even on Elastic Cloud', () => {
    const shaped = shapeSingle(otelAppender, true, true);

    expect(shaped.attributes).toEqual({
      'service.name': 'serverless-kibana',
      'service.type': 'kibana',
    });
  });

  it('lets the appender attributes config override the default service.name', () => {
    const shaped = shapeSingle(
      { ...otelAppender, attributes: { 'service.name': 'happy-kibana' } },
      false
    );

    expect(shaped.attributes).toEqual({
      'service.name': 'happy-kibana',
      'service.type': 'kibana',
    });
    // the allowlist is not widened by extra configured attributes
    expect(shaped.includeResources).toEqual(['service.name', 'service.type']);
  });

  it('passes non-otel appenders through untouched', () => {
    const consoleAppender: PluginAppenderConfigType = {
      type: 'console',
      layout: { type: 'json' },
    };
    const shaped = shapeUserActivityOtelAppenders(
      new Map([['console_appender', consoleAppender]]),
      false,
      false
    );

    expect(shaped.get('console_appender')).toBe(consoleAppender);
  });
});
