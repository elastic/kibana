/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ConnectorSpec } from '../../connector_spec';
import {
  buildCoverageDocument,
  getDirection,
  getExemptApiType,
  getRecordedApiType,
} from './connector_coverage';
import type { VendorApiManifest } from './manifest';

const spec = (id: string, actions: string[], events: string[] = []): ConnectorSpec =>
  ({
    metadata: { id },
    actions: Object.fromEntries(actions.map((name) => [name, {}])),
    ...(events.length > 0
      ? { events: { definitions: Object.fromEntries(events.map((name) => [name, {}])) } }
      : {}),
  } as unknown as ConnectorSpec);

const manifest = (...formats: string[]): VendorApiManifest =>
  ({
    operations: {},
    sources: Object.fromEntries(
      formats.map((format, index) => [
        `v${index}`,
        { format, url: 'https://example.com/spec', fetchedAt: '2026-01-01T00:00:00.000Z' },
      ])
    ),
  } as unknown as VendorApiManifest);

describe('getDirection', () => {
  it.each([
    ['outbound', spec('.a', ['run'])],
    ['inbound', spec('.b', [], ['pushed'])],
    ['both', spec('.c', ['run'], ['pushed'])],
  ])('reports %s', (direction, connector) => {
    expect(getDirection(connector)).toBe(direction);
  });
});

describe('getExemptApiType', () => {
  it.each([
    ['MCP connector: all actions go through the hosted MCP server', 'mcp'],
    ['Talks to Azure SQL Database through the mssql driver', 'database'],
    ['Generic connector: the caller picks the path', 'generic'],
    ['Publishes only HTML docs', 'none'],
  ])('reads %s as %s', (reason, apiType) => {
    expect(getExemptApiType(reason)).toBe(apiType);
  });
});

describe('getRecordedApiType', () => {
  it('maps Markdown formats to markdown', () => {
    expect(getRecordedApiType(manifest('brave-markdown'))).toBe('markdown');
  });

  it('uses the most common source format', () => {
    expect(getRecordedApiType(manifest('swagger', 'openapi', 'openapi'))).toBe('openapi');
  });
});

describe('buildCoverageDocument', () => {
  it('marks a recorded connector as emulated and drift protected', () => {
    expect(
      buildCoverageDocument({ spec: spec('.drive', ['list']), manifest: manifest('discovery') })
    ).toEqual({
      connector_id: '.drive',
      direction: 'outbound',
      api_type: 'discovery',
      emulated: true,
      drift_protection: 'full',
    });
  });

  it('keeps the reason of an exempt connector', () => {
    expect(
      buildCoverageDocument({
        spec: spec('.sql', ['query']),
        exemptionReason: 'Talks to the database through a driver',
      })
    ).toEqual({
      connector_id: '.sql',
      direction: 'outbound',
      api_type: 'database',
      emulated: false,
      drift_protection: 'none',
      exemption_reason: 'Talks to the database through a driver',
    });
  });
});
