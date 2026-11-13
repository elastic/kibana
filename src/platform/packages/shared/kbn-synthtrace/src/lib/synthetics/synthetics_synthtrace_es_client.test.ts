/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { syntheticsMonitor } from '@kbn/synthtrace-client';
import { Readable } from 'stream';
import { syntheticsPipeline } from './synthetics_synthtrace_es_client';

const TIMESTAMP = new Date('2026-01-01T10:00:00.000Z').getTime();

const runPipeline = async (
  monitors: Array<ReturnType<typeof syntheticsMonitor.create>>
): Promise<Array<Record<string, unknown>>> => {
  const output = syntheticsPipeline()(Readable.from(monitors));
  const documents: Array<Record<string, unknown>> = [];

  await new Promise<void>((resolve, reject) => {
    output.on('data', (document: Record<string, unknown>) => documents.push(document));
    output.on('end', resolve);
    output.on('error', reject);
  });

  return documents;
};

describe('syntheticsPipeline', () => {
  const monitor = () =>
    syntheticsMonitor
      .create()
      .dataset('tcp')
      .name('Database')
      .configId('config-1')
      .spaceId('team-a')
      .tags(['production'])
      .location({ id: 'location-id', label: 'Location label' })
      .url('db.example.com:5432')
      .timestamp(TIMESTAMP)
      .up();

  it('routes each document to the synthetics data stream of its dataset', async () => {
    const [document] = await runPipeline([monitor()]);

    expect(document._index).toBe('synthetics-tcp-default');
  });

  it('indexes the fields as nested objects, as the Synthetics agent does', async () => {
    const [document] = await runPipeline([monitor()]);

    expect(document).toMatchObject({
      data_stream: { type: 'synthetics', dataset: 'tcp', namespace: 'default' },
      monitor: { name: 'Database', type: 'tcp', status: 'up' },
      config_id: 'config-1',
      observer: { name: 'location-id', geo: { name: 'Location label' } },
      url: { full: 'db.example.com:5432', domain: 'db.example.com' },
      summary: { up: 1, down: 0, final_attempt: true },
      state: { status: 'up', up: 1, down: 0 },
      tags: ['production'],
    });
    expect(document).not.toHaveProperty(['monitor.name']);
    expect(document).not.toHaveProperty(['observer.geo.name']);
  });

  it('keeps meta, which holds the space id the Synthetics app filters on', async () => {
    const [document] = await runPipeline([monitor()]);

    expect(document.meta).toEqual({ space_id: 'team-a' });
  });

  it('writes the timestamp as an ISO string', async () => {
    const [document] = await runPipeline([monitor()]);

    expect(document['@timestamp']).toBe('2026-01-01T10:00:00.000Z');
  });

  it('keeps every document of a journey run', async () => {
    const journey = monitor().journey({
      id: 'journey',
      name: 'Journey',
      checkGroup: 'check-group',
      steps: [{ name: 'Step' }],
    });

    const documents = await runPipeline(journey);

    expect(documents).toHaveLength(3);
    expect(documents.map((document) => document._index)).toEqual([
      'synthetics-browser-default',
      'synthetics-browser-default',
      'synthetics-browser-default',
    ]);
    expect(documents[1]).toMatchObject({
      synthetics: { type: 'step/end', step: { index: 1, name: 'Step', status: 'succeeded' } },
    });
  });
});
