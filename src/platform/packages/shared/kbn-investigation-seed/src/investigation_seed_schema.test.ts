/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { AggregateQuery, Filter, Query } from '@kbn/es-query';
import {
  MAX_INVESTIGATION_FIELD_CHARS,
  MAX_INVESTIGATION_FILTERS,
  MAX_INVESTIGATION_HOSTS,
  MAX_INVESTIGATION_TEXT_CHARS,
  investigationSeedSchema,
  isEsqlQuery,
  resolveInvestigationHosts,
} from './investigation_seed_schema';

const filter = (query: string): Filter => ({
  meta: { type: 'phrase' },
  query: { match_phrase: { 'service.name': query } },
});

const validSeed = () => ({
  origin: { app: 'alerts' as const, alertId: 'alert-1', ruleTypeId: 'apm.latency' },
  timeRange: { from: 'now-15m', to: 'now' },
  filters: [filter('checkout')],
  entities: { 'service.name': 'checkout' },
});

describe('investigationSeedSchema', () => {
  it('accepts an alert end, a log view, and a fractional lookback', () => {
    const parsed = investigationSeedSchema.parse({
      ...validSeed(),
      origin: {
        app: 'alerts',
        alertId: 'alert-1',
        ruleTypeId: 'logs.alert.document.count',
        alertEnd: '2026-11-02T12:00:00.000Z',
        logViewId: 'log-view-1',
        lookback: { timeSize: 1.5, timeUnit: 'm' },
      },
    });

    expect(parsed.origin).toEqual({
      app: 'alerts',
      alertId: 'alert-1',
      ruleTypeId: 'logs.alert.document.count',
      alertEnd: '2026-11-02T12:00:00.000Z',
      logViewId: 'log-view-1',
      lookback: { timeSize: 1.5, timeUnit: 'm' },
    });
  });

  it('rejects a non-positive lookback', () => {
    expect(
      investigationSeedSchema.safeParse({
        ...validSeed(),
        origin: {
          app: 'alerts',
          alertId: 'alert-1',
          ruleTypeId: 'logs.alert.document.count',
          lookback: { timeSize: 0, timeUnit: 'm' },
        },
      }).success
    ).toBe(false);
  });

  it('accepts an alert seed and infers the entity', () => {
    const parsed = investigationSeedSchema.parse(validSeed());

    expect(parsed.entities['service.name']).toBe('checkout');
    expect(parsed.origin.app).toBe('alerts');
  });

  it('rejects more than the filter cap', () => {
    const result = investigationSeedSchema.safeParse({
      ...validSeed(),
      filters: Array.from({ length: MAX_INVESTIGATION_FILTERS + 1 }, () => filter('checkout')),
    });

    expect(result.success).toBe(false);
  });

  it('rejects an oversized filter, query, entity, and panel title', () => {
    const oversized = 'x'.repeat(MAX_INVESTIGATION_TEXT_CHARS + 1);
    const oversizedField = 'x'.repeat(MAX_INVESTIGATION_FIELD_CHARS + 1);

    expect(
      investigationSeedSchema.safeParse({ ...validSeed(), filters: [filter(oversized)] }).success
    ).toBe(false);
    expect(
      investigationSeedSchema.safeParse({
        ...validSeed(),
        query: { language: 'kuery', query: oversized },
      }).success
    ).toBe(false);
    expect(
      investigationSeedSchema.safeParse({
        ...validSeed(),
        entities: { 'service.name': oversizedField },
      }).success
    ).toBe(false);
    expect(
      investigationSeedSchema.safeParse({
        ...validSeed(),
        origin: { app: 'dashboard', panelTitle: oversizedField },
      }).success
    ).toBe(false);
  });

  it('rejects an unknown entity field and an inverted selection, and accepts user.name and source.ip', () => {
    expect(
      investigationSeedSchema.safeParse({
        ...validSeed(),
        entities: { 'process.name': 'bash' },
      }).success
    ).toBe(false);
    expect(
      investigationSeedSchema.safeParse({
        ...validSeed(),
        entities: { 'user.name': 'ada', 'source.ip': '203.0.113.10' },
      }).success
    ).toBe(true);
    expect(
      investigationSeedSchema.safeParse({
        ...validSeed(),
        selection: { start: 20, end: 10 },
      }).success
    ).toBe(false);
  });

  it('accepts a bounded ES|QL query and identifies it', () => {
    const query: AggregateQuery = { esql: 'FROM logs* | STATS count()' };
    const parsed = investigationSeedSchema.parse({ ...validSeed(), query });

    expect(parsed.query && isEsqlQuery(parsed.query)).toBe(true);
  });

  it('does not treat a KQL query as ES|QL', () => {
    const query: Query = { language: 'kuery', query: 'service.name: checkout' };

    expect(isEsqlQuery(query)).toBe(false);
  });

  it('bounds the hosts array at 10 and resolves deduplicated hosts', () => {
    expect(
      investigationSeedSchema.safeParse({
        ...validSeed(),
        hosts: Array.from({ length: MAX_INVESTIGATION_HOSTS + 1 }, (_, i) => `host-${i}`),
      }).success
    ).toBe(false);

    const parsed = investigationSeedSchema.parse({
      ...validSeed(),
      entities: { 'service.name': 'checkout', 'host.name': 'web-1' },
      hosts: ['web-1', 'web-2', 'web-3'],
    });

    expect(resolveInvestigationHosts(parsed)).toEqual(['web-1', 'web-2', 'web-3']);
  });
});
