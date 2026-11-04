/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SyntheticsMonitorDocument } from '.';
import { syntheticsMonitor } from '.';

describe('syntheticsMonitor', () => {
  it('creates an http monitor in the default namespace', () => {
    const [doc] = syntheticsMonitor.create().name('my-monitor').serialize();

    expect(doc).toEqual({
      'data_stream.namespace': 'default',
      'data_stream.type': 'synthetics',
      'data_stream.dataset': 'http',
      'monitor.type': 'http',
      'monitor.name': 'my-monitor',
    });
  });

  describe('setters', () => {
    it('sets config, space, tags and interval', () => {
      const [doc] = syntheticsMonitor
        .create()
        .configId('config-1')
        .spaceId('team-a')
        .tags(['production', 'critical'])
        .interval(180)
        .serialize();

      expect(doc).toMatchObject({
        config_id: 'config-1',
        'meta.space_id': 'team-a',
        tags: ['production', 'critical'],
        'monitor.interval': 180,
      });
    });

    it('uses the location id as observer.name and the label as observer.geo.name', () => {
      const [doc] = syntheticsMonitor
        .create()
        .location({ id: 'loc-id', label: 'Loc label' })
        .serialize();

      expect(doc).toMatchObject({
        'observer.name': 'loc-id',
        'observer.geo.name': 'Loc label',
      });
    });

    it.each([
      ['https://www.elastic.co/docs', 'www.elastic.co'],
      ['http://localhost:5601/app', 'localhost'],
      ['db-primary.example.com:5432', 'db-primary.example.com'],
      ['gw.example.com', 'gw.example.com'],
    ])('derives url.domain from %s', (full, domain) => {
      const [doc] = syntheticsMonitor.create().url(full).serialize();

      expect(doc).toMatchObject({ 'url.full': full, 'url.domain': domain });
    });

    it('sets the error message and type', () => {
      const [doc] = syntheticsMonitor
        .create()
        .error({ message: 'connection refused', type: 'io' })
        .serialize();

      expect(doc).toMatchObject({ 'error.message': 'connection refused', 'error.type': 'io' });
    });
  });

  it('accepts the summary, state, observer and config fields used by the Synthetics UI', () => {
    const fields: SyntheticsMonitorDocument = {
      config_id: 'config-1',
      'meta.space_id': 'default',
      tags: ['production'],
      'monitor.interval': 180,
      'observer.name': 'location-id',
      'observer.geo.name': 'Location label',
      'summary.up': 1,
      'summary.down': 0,
      'summary.final_attempt': true,
      'state.id': 'state-1',
      'state.up': 1,
      'state.down': 0,
      'state.checks': 1,
      'state.status': 'up',
      'state.started_at': '2026-01-01T00:00:00.000Z',
      'state.duration_ms': 0,
      'url.full': 'https://example.com',
      'url.domain': 'example.com',
      'error.message': 'connection refused',
      'error.type': 'io',
      'agent.type': 'heartbeat',
    };

    const [doc] = syntheticsMonitor.create().defaults(fields).serialize();

    expect(doc).toMatchObject(fields);
  });
});
