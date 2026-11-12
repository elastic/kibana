/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Client } from '@elastic/elasticsearch';
import type { Serializable, SyntheticsMonitorDocument } from '@kbn/synthtrace-client';
import { timerange } from '@kbn/synthtrace-client';
import type { ScenarioInitOptions } from '../../cli/scenario';
import type { SynthtraceClients } from '../../cli/utils/clients_manager';
import { getServiceUrls } from '../../cli/utils/get_service_urls';
import { KibanaClient } from '../../lib/shared/base_kibana_client';
import { discoverPrivateLocation } from '../../lib/synthetics/synthetics_private_locations_api';
import scenario from '../synthetics_overview';
import { SYNTHETICS_OVERVIEW_TAG, getOverviewMonitors } from './synthetics_overview';

jest.mock('../../cli/utils/get_service_urls', () => ({ getServiceUrls: jest.fn() }));
jest.mock('../../lib/synthetics/synthetics_private_locations_api', () => ({
  discoverPrivateLocation: jest.fn(),
}));

const LOCATION = { id: 'location-id', label: 'Location label' };
const FROM = new Date('2026-01-01T00:00:00.000Z').getTime();
const TO = FROM + 30 * 60 * 1000;

const scenarioOpts = {
  privateLocationId: LOCATION.id,
  privateLocationLabel: LOCATION.label,
  monitors: 4,
};

const logger = { info: jest.fn() };

const init = (opts: Record<string, unknown> = scenarioOpts) =>
  scenario({ scenarioOpts: opts, from: FROM, to: TO, logger } as unknown as ScenarioInitOptions);

const clients = { syntheticsEsClient: {} } as SynthtraceClients;

const generateDocuments = async (): Promise<SyntheticsMonitorDocument[]> => {
  const { generate } = await init();
  const output = generate({ range: timerange(FROM, TO), clients });
  const { generator } = Array.isArray(output) ? output[0] : output;
  const generators = Array.isArray(generator) ? generator : [generator];

  return generators.flatMap((monitorGenerator) =>
    Array.from(monitorGenerator as Iterable<Serializable<SyntheticsMonitorDocument>>).flatMap(
      (event) => event.serialize()
    )
  );
};

const createKibanaClient = () => {
  const kibanaClient = new KibanaClient({ target: 'http://localhost:5601' });
  const fetch = jest
    .spyOn(kibanaClient, 'fetch')
    .mockResolvedValue({ monitors: [], total: 0 } as never);

  return { kibanaClient, fetch };
};

describe('synthetics_overview scenario', () => {
  describe('private location', () => {
    beforeEach(() => {
      jest.mocked(getServiceUrls).mockReset();
      jest.mocked(discoverPrivateLocation).mockReset();
      jest.mocked(getServiceUrls).mockResolvedValue({
        kibanaUrl: 'http://localhost:5601',
        username: 'elastic',
        password: 'changeme',
      } as never);
      jest.mocked(discoverPrivateLocation).mockResolvedValue(LOCATION);
    });

    const locationOfFirstCheck = async (opts: Record<string, unknown>) => {
      const { generate } = await init(opts);
      const output = generate({ range: timerange(FROM, FROM + 60 * 1000), clients });
      const { generator } = Array.isArray(output) ? output[0] : output;
      const [first] = Array.isArray(generator) ? generator : [generator];
      const [event] = Array.from(first as Iterable<Serializable<SyntheticsMonitorDocument>>);

      return event.serialize()[0]['observer.name'];
    };

    it('does not look for it when the options name one', async () => {
      await init();

      expect(discoverPrivateLocation).not.toHaveBeenCalled();
    });

    it('uses the only private location of the space when the options do not name one', async () => {
      await expect(locationOfFirstCheck({ monitors: 4 })).resolves.toBe(LOCATION.id);

      expect(discoverPrivateLocation).toHaveBeenCalledWith(
        expect.objectContaining({ spaceId: 'default' })
      );
    });

    it('looks in the space of the scenario', async () => {
      await init({ monitors: 4, spaceId: 'team-a' });

      expect(discoverPrivateLocation).toHaveBeenCalledWith(
        expect.objectContaining({ spaceId: 'team-a' })
      );
    });

    it('fails with the reason when it cannot find one', async () => {
      jest
        .mocked(discoverPrivateLocation)
        .mockRejectedValue(new Error('No private location found'));

      await expect(init({ monitors: 4 })).rejects.toThrow('No private location found');
    });

    it('rejects a location id without a label', async () => {
      await expect(init({ privateLocationId: 'id' })).rejects.toThrow('privateLocationLabel');
    });
  });

  describe('generate', () => {
    it('writes the checks of every monitor for the range, to the synthetics client', async () => {
      const { generate } = await init();
      const output = generate({ range: timerange(FROM, TO), clients });
      const { client } = Array.isArray(output) ? output[0] : output;

      expect(client).toBe(clients.syntheticsEsClient);

      const documents = await generateDocuments();
      const byDataset = (dataset: string) =>
        documents.filter((document) => document['data_stream.dataset'] === dataset).length;

      // 30 minutes: http and tcp every 3 minutes, icmp every 5, browser every 10 (4 documents a run).
      expect(byDataset('http')).toBe(10);
      expect(byDataset('tcp')).toBe(10);
      expect(byDataset('icmp')).toBe(6);
      expect(byDataset('browser')).toBe(12);
      expect(documents).toHaveLength(38);
    });

    it('points every document at one of the monitors that bootstrap creates', async () => {
      const documents = await generateDocuments();
      const ids = getOverviewMonitors({
        monitors: 4,
        privateLocation: LOCATION,
        spaceId: 'default',
      }).map(({ config }) => config.id);

      for (const document of documents) {
        expect(ids).toContain(document.config_id);
        expect(document['observer.name']).toBe(LOCATION.id);
        expect(document['observer.geo.name']).toBe(LOCATION.label);
        expect(document['meta.space_id']).toBe('default');
      }
    });

    it('includes up and down checks', async () => {
      const statuses = new Set(
        (await generateDocuments()).map((document) => document['monitor.status'])
      );

      expect(statuses).toContain('up');
      expect(statuses).toContain('down');
    });

    it('generates the same documents on every run', async () => {
      expect(await generateDocuments()).toEqual(await generateDocuments());
    });
  });

  describe('bootstrap', () => {
    it('replaces the monitors of a previous run with the catalog', async () => {
      const { bootstrap } = await init();
      const { kibanaClient, fetch } = createKibanaClient();

      await bootstrap?.(clients, kibanaClient, {} as Client);

      const calls = fetch.mock.calls.map(([path, options]) => [path, options?.method]);
      expect(calls[0]).toEqual([
        `/api/synthetics/monitors?tags=${SYNTHETICS_OVERVIEW_TAG}&perPage=1000&page=1`,
        'GET',
      ]);
      expect(calls.slice(1).map(([path]) => String(path).split('?id=')[0])).toEqual(
        Array(4).fill('/api/synthetics/monitors')
      );

      const bodies = fetch.mock.calls
        .slice(1)
        .map(([, options]) => JSON.parse(String(options?.body)));
      expect(bodies.map(({ name }) => name)).toEqual([
        'Synthtrace HTTP 1',
        'Synthtrace TCP 2',
        'Synthtrace ICMP 3',
        'Synthtrace BROWSER 4',
      ]);
      for (const body of bodies) {
        expect(body.private_locations).toEqual([LOCATION.id]);
        expect(body.tags).toContain(SYNTHETICS_OVERVIEW_TAG);
      }
    });

    it('logs how many monitors it created', async () => {
      logger.info.mockClear();
      const { bootstrap } = await init();

      await bootstrap?.(clients, createKibanaClient().kibanaClient, {} as Client);

      expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('Created 4 monitors'));
    });
  });

  describe('teardown', () => {
    beforeEach(() => {
      logger.info.mockClear();
    });

    it('keeps the monitors by default, and says so', async () => {
      const { teardown } = await init();
      const { kibanaClient, fetch } = createKibanaClient();

      await teardown?.(clients, kibanaClient, {} as Client);

      expect(fetch).not.toHaveBeenCalled();
      expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('Leaving the monitors'));
    });

    it('deletes the monitors when deleteMonitorsOnExit is set, and logs how many', async () => {
      const { teardown } = await init({ ...scenarioOpts, deleteMonitorsOnExit: true });
      const { kibanaClient, fetch } = createKibanaClient();

      await teardown?.(clients, kibanaClient, {} as Client);

      expect(fetch).toHaveBeenCalledTimes(1);
      expect(String(fetch.mock.calls[0][0])).toContain(`tags=${SYNTHETICS_OVERVIEW_TAG}`);
      expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('Deleted 0 monitors'));
    });
  });
});
