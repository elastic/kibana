/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createEmulatorFetch } from '../fetch/create_emulator_fetch';
import type { ResponseFixture } from './response_engine';

const job = {
  type: 'object',
  required: ['status'],
  properties: { status: { type: 'string', enum: ['scraping', 'completed', 'failed'] } },
};

const spec = {
  openapi: '3.0.3',
  info: { title: 'Test', version: '1' },
  servers: [{ url: 'https://api.example.com' }],
  paths: {
    '/jobs/{id}': {
      get: {
        operationId: 'getJob',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '200': { description: 'ok', content: { 'application/json': { schema: job } } },
          '404': { description: 'not ready yet' },
        },
      },
    },
  },
};

const getJob = { method: 'GET', path: '/jobs/{id}' };
const status = (value: string) => ({ status: 200, body: { status: value } });

const setup = (fixtures: ResponseFixture[] = []) => {
  const emulator = createEmulatorFetch({ specs: [spec], fixtures });
  const poll = async (id = '1') => {
    const response = await emulator.fetch(`https://api.example.com/jobs/${id}`);
    return response.status === 200
      ? ((await response.json()) as { status: string }).status
      : response.status;
  };
  return { ...emulator, poll };
};

describe('response sequences', () => {
  it('answer requests in turn, repeating the last response', async () => {
    const { poll, calls } = setup([
      {
        operation: getJob,
        responses: [status('scraping'), status('scraping'), status('completed')],
      },
    ]);

    expect([await poll(), await poll(), await poll(), await poll()]).toEqual([
      'scraping',
      'scraping',
      'completed',
      'completed',
    ]);
    expect(calls.map(({ responseSource }) => responseSource)).toEqual([
      'fixture',
      'fixture',
      'fixture',
      'fixture',
    ]);
  });

  it('can start with an error status, as a result that is not ready yet', async () => {
    const { poll, calls } = setup([
      { operation: getJob, responses: [{ status: 404 }, status('completed')] },
    ]);

    expect([await poll(), await poll()]).toEqual([404, 'completed']);
    expect(calls.map(({ status: code }) => code)).toEqual([404, 200]);
  });

  it('keep one count per fixture, so sequences with different `when`s advance separately', async () => {
    const { poll } = setup([
      {
        operation: getJob,
        when: { path: { id: '1' } },
        responses: [status('scraping'), status('completed')],
      },
      {
        operation: getJob,
        when: { path: { id: '2' } },
        responses: [status('scraping'), status('failed')],
      },
    ]);

    expect([await poll('1'), await poll('2'), await poll('1'), await poll('2')]).toEqual([
      'scraping',
      'scraping',
      'completed',
      'failed',
    ]);
  });

  it('start again after reset', async () => {
    const { poll, reset } = setup([
      { operation: getJob, responses: [status('scraping'), status('completed')] },
    ]);

    await poll();
    expect(await poll()).toBe('completed');
    reset();
    expect(await poll()).toBe('scraping');
  });

  it('reject an empty sequence, and sequences for named operations', () => {
    const { rejectedResponses } = setup([
      { operation: getJob, responses: [] },
      { operation: { name: 'query boards' }, responses: [status('completed')] },
    ]);

    expect(rejectedResponses).toEqual([
      expect.objectContaining({
        operation: 'GET /jobs/{id}',
        violations: [expect.objectContaining({ code: 'responses', path: ['responses'] })],
      }),
      expect.objectContaining({
        operation: 'query boards',
        violations: [expect.objectContaining({ code: 'responses' })],
      }),
    ]);
  });

  describe('as runtime fixtures', () => {
    it('are served in turn, and start again when set again or reset', async () => {
      const { poll, runtimeFixtures, reset } = setup();
      const sequence: ResponseFixture = {
        operation: getJob,
        responses: [status('scraping'), status('completed')],
      };

      expect(runtimeFixtures.set([sequence])).toEqual([]);
      expect([await poll(), await poll()]).toEqual(['scraping', 'completed']);

      runtimeFixtures.set([sequence]);
      expect(await poll()).toBe('scraping');

      reset();
      runtimeFixtures.set([sequence]);
      expect(await poll()).toBe('scraping');
      expect(runtimeFixtures.list()).toEqual([sequence]);
    });

    it('check every response, naming the one the spec rejects', () => {
      const { runtimeFixtures } = setup();

      const rejected = runtimeFixtures.set([
        {
          operation: getJob,
          responses: [status('scraping'), { status: 200, body: { status: 'paused' } }],
        },
      ]);

      expect(rejected).toEqual([
        expect.objectContaining({
          operation: 'GET /jobs/{id}',
          violations: [
            expect.objectContaining({ path: expect.arrayContaining(['responses', '1']) }),
          ],
        }),
      ]);
      expect(runtimeFixtures.list()).toEqual([]);
    });

    it('may include an error status the spec does not declare, such as a 429', async () => {
      const { poll, runtimeFixtures } = setup();

      expect(
        runtimeFixtures.set([
          { operation: getJob, responses: [{ status: 429 }, status('completed')] },
        ])
      ).toEqual([]);
      expect([await poll(), await poll()]).toEqual([429, 'completed']);
    });
  });
});
