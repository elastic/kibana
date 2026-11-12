/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SyntheticsMonitorConfig } from './synthetics_monitors_api';
import { createSyntheticsMonitorsApi, getMonitorConfigId } from './synthetics_monitors_api';

const TAG = 'synthtrace-test';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

const httpMonitor: SyntheticsMonitorConfig = {
  id: getMonitorConfigId('http-1'),
  type: 'http',
  name: 'Homepage',
  target: 'https://www.elastic.co',
  scheduleMinutes: 3,
  tags: ['production'],
  locations: ['us_central'],
};

const setup = (options: { spaceId?: string; pageSize?: number } = {}) => {
  const fetch = jest.fn();
  const api = createSyntheticsMonitorsApi({ kibana: { fetch }, tag: TAG, ...options });
  const requestBody = (callIndex: number) => JSON.parse(fetch.mock.calls[callIndex][1].body);

  return { api, fetch, requestBody };
};

describe('getMonitorConfigId', () => {
  it('returns a UUID', () => {
    expect(getMonitorConfigId('http-1')).toMatch(UUID);
  });

  it('is stable for the same key and different for different keys', () => {
    expect(getMonitorConfigId('http-1')).toBe(getMonitorConfigId('http-1'));
    expect(getMonitorConfigId('http-1')).not.toBe(getMonitorConfigId('http-2'));
  });
});

describe('createSyntheticsMonitorsApi', () => {
  describe('createMonitors', () => {
    it('posts each monitor with its config id as the monitor id', async () => {
      const { api, fetch } = setup();
      const secondId = getMonitorConfigId('http-2');

      await api.createMonitors([httpMonitor, { ...httpMonitor, id: secondId }]);

      expect(fetch).toHaveBeenCalledTimes(2);
      expect(fetch.mock.calls[0][0]).toBe(`/api/synthetics/monitors?id=${httpMonitor.id}`);
      expect(fetch.mock.calls[0][1]).toMatchObject({ method: 'POST' });
      expect(fetch.mock.calls[1][0]).toBe(`/api/synthetics/monitors?id=${secondId}`);
    });

    it('builds an http monitor body with the marker tag and a schedule', async () => {
      const { api, requestBody } = setup();

      await api.createMonitors([httpMonitor]);

      expect(requestBody(0)).toEqual({
        type: 'http',
        name: 'Homepage',
        enabled: true,
        tags: [TAG, 'production'],
        schedule: { number: '3', unit: 'm' },
        locations: ['us_central'],
        urls: 'https://www.elastic.co',
      });
    });

    it('uses hosts for tcp and icmp monitors', async () => {
      const { api, requestBody } = setup();

      await api.createMonitors([
        { ...httpMonitor, type: 'tcp', target: 'db.example.com:5432' },
        { ...httpMonitor, type: 'icmp', target: 'gw.example.com' },
      ]);

      expect(requestBody(0)).toMatchObject({ type: 'tcp', hosts: 'db.example.com:5432' });
      expect(requestBody(0)).not.toHaveProperty('urls');
      expect(requestBody(1)).toMatchObject({ type: 'icmp', hosts: 'gw.example.com' });
    });

    it('uses an inline script for browser monitors, with a default when none is given', async () => {
      const { api, requestBody } = setup();
      const script = 'step("a", async () => {});';

      await api.createMonitors([
        { ...httpMonitor, type: 'browser', script },
        { ...httpMonitor, type: 'browser' },
      ]);

      expect(requestBody(0)).toMatchObject({ 'source.inline.script': script });
      expect(requestBody(1)['source.inline.script']).toContain("step('Load page'");
    });

    it('sends private locations and disabled monitors', async () => {
      const { api, requestBody } = setup();

      await api.createMonitors([
        { ...httpMonitor, locations: [], privateLocations: ['pl-1'], enabled: false },
      ]);

      expect(requestBody(0)).toMatchObject({ private_locations: ['pl-1'], enabled: false });
      expect(requestBody(0)).not.toHaveProperty('locations');
    });

    it('does not duplicate the marker tag', async () => {
      const { api, requestBody } = setup();

      await api.createMonitors([{ ...httpMonitor, tags: [TAG, 'production'] }]);

      expect(requestBody(0).tags).toEqual([TAG, 'production']);
    });

    it('prefixes the path with the space for non-default spaces', async () => {
      const { api, fetch } = setup({ spaceId: 'team-a' });

      await api.createMonitors([httpMonitor]);

      expect(fetch.mock.calls[0][0]).toBe(`/s/team-a/api/synthetics/monitors?id=${httpMonitor.id}`);
    });

    it('rejects a monitor without any location before sending anything', async () => {
      const { api, fetch } = setup();

      await expect(api.createMonitors([{ ...httpMonitor, locations: [] }])).rejects.toThrow(
        'Monitor "Homepage" needs at least one public or private location'
      );
      expect(fetch).not.toHaveBeenCalled();
    });

    it('rejects an id that is not a UUID before sending anything', async () => {
      const { api, fetch } = setup();

      await expect(api.createMonitors([{ ...httpMonitor, id: 'http-1' }])).rejects.toThrow(
        'Monitor "Homepage" has id "http-1", but Kibana only accepts UUIDs'
      );
      expect(fetch).not.toHaveBeenCalled();
    });
  });

  describe('deleteMonitors', () => {
    it('lists the monitors by tag and bulk deletes them', async () => {
      const { api, fetch, requestBody } = setup();
      fetch
        .mockResolvedValueOnce({
          monitors: [{ id: 'a' }, { id: 'b', config_id: 'b-config' }],
          total: 2,
        })
        .mockResolvedValueOnce({
          result: [
            { id: 'a', deleted: true },
            { id: 'b-config', deleted: true },
          ],
        });

      const deleted = await api.deleteMonitors();

      expect(deleted).toBe(2);
      expect(fetch.mock.calls[0][0]).toBe(
        `/api/synthetics/monitors?tags=${TAG}&perPage=1000&page=1`
      );
      expect(fetch.mock.calls[1][0]).toBe('/api/synthetics/monitors/_bulk_delete');
      expect(fetch.mock.calls[1][1]).toMatchObject({ method: 'POST' });
      expect(requestBody(1)).toEqual({ ids: ['a', 'b-config'] });
    });

    it('does not call bulk delete when no monitor carries the tag', async () => {
      const { api, fetch } = setup();
      fetch.mockResolvedValueOnce({ monitors: [], total: 0 });

      expect(await api.deleteMonitors()).toBe(0);
      expect(fetch).toHaveBeenCalledTimes(1);
    });

    it('reads every page before deleting', async () => {
      const { api, fetch, requestBody } = setup({ pageSize: 2 });
      fetch
        .mockResolvedValueOnce({ monitors: [{ id: 'a' }, { id: 'b' }], total: 3 })
        .mockResolvedValueOnce({ monitors: [{ id: 'c' }], total: 3 })
        .mockResolvedValueOnce({
          result: [
            { id: 'a', deleted: true },
            { id: 'b', deleted: true },
            { id: 'c', deleted: true },
          ],
        });

      expect(await api.deleteMonitors()).toBe(3);
      expect(fetch.mock.calls[0][0]).toContain('perPage=2&page=1');
      expect(fetch.mock.calls[1][0]).toContain('perPage=2&page=2');
      expect(requestBody(2)).toEqual({ ids: ['a', 'b', 'c'] });
    });

    it('prefixes the paths with the space for non-default spaces', async () => {
      const { api, fetch } = setup({ spaceId: 'team-a' });
      fetch
        .mockResolvedValueOnce({ monitors: [{ id: 'a' }], total: 1 })
        .mockResolvedValueOnce({ result: [{ id: 'a', deleted: true }] });

      await api.deleteMonitors();

      expect(fetch.mock.calls[0][0]).toMatch(/^\/s\/team-a\/api\/synthetics\/monitors\?/);
      expect(fetch.mock.calls[1][0]).toBe('/s/team-a/api/synthetics/monitors/_bulk_delete');
    });

    it('fails when a monitor is reported as not deleted', async () => {
      const { api, fetch } = setup();
      fetch
        .mockResolvedValueOnce({ monitors: [{ id: 'a' }, { id: 'b' }], total: 2 })
        .mockResolvedValueOnce({
          result: [
            { id: 'a', deleted: true },
            { id: 'b', deleted: false, error: 'Monitor id b not found!' },
          ],
        });

      await expect(api.deleteMonitors()).rejects.toThrow(
        'Failed to delete every monitor tagged synthtrace-test: 1 of 2 deleted; not deleted: b (Monitor id b not found!)'
      );
    });

    it('fails when the location sync reports errors', async () => {
      const { api, fetch } = setup();
      fetch
        .mockResolvedValueOnce({ monitors: [{ id: 'a' }], total: 1 })
        .mockResolvedValueOnce({
          result: [{ id: 'a', deleted: true }],
          errors: [{ location: 'us_central', error: 'timeout' }],
        });

      await expect(api.deleteMonitors()).rejects.toThrow('service sync errors');
    });
  });
});
