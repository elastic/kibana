/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { errors as EsErrors } from '@elastic/elasticsearch';
import { elasticsearchClientMock } from '@kbn/core-elasticsearch-client-server-mocks';
import { ensureInferenceEndpoints } from './ensure_inference_endpoints';

const createResponseError = (statusCode: number) =>
  new EsErrors.ResponseError(
    elasticsearchClientMock.createApiResponse({
      statusCode,
      body: { error: { type: 'es_type', reason: 'es_reason' } },
    })
  );

describe('ensureInferenceEndpoints', () => {
  let client: ReturnType<typeof elasticsearchClientMock.createInternalClient>;

  beforeEach(() => {
    client = elasticsearchClientMock.createInternalClient();
  });

  it('returns an empty report and makes no ES calls when inferenceIds is empty', async () => {
    const report = await ensureInferenceEndpoints(client, []);

    expect(client.inference.get).not.toHaveBeenCalled();
    expect(report).toEqual({ checked: [], missing: [], errors: [] });
  });

  it('adds endpoint to checked when inference.get resolves', async () => {
    client.inference.get.mockResolvedValueOnce({ endpoints: [] } as any);

    const report = await ensureInferenceEndpoints(client, ['.elser-2-elasticsearch']);

    expect(client.inference.get).toHaveBeenCalledWith({
      inference_id: '.elser-2-elasticsearch',
    });
    expect(report.checked).toEqual(['.elser-2-elasticsearch']);
    expect(report.missing).toEqual([]);
    expect(report.errors).toEqual([]);
  });

  it('adds endpoint to missing when inference.get rejects with 404', async () => {
    client.inference.get.mockRejectedValueOnce(createResponseError(404));

    const report = await ensureInferenceEndpoints(client, ['.elser-2-elasticsearch']);

    expect(report.checked).toEqual([]);
    expect(report.missing).toEqual(['.elser-2-elasticsearch']);
    expect(report.errors).toEqual([]);
  });

  it('adds endpoint to errors when inference.get rejects with a non-404 error', async () => {
    client.inference.get.mockRejectedValueOnce(createResponseError(503));

    const report = await ensureInferenceEndpoints(client, ['.elser-2-elasticsearch']);

    expect(report.checked).toEqual([]);
    expect(report.missing).toEqual([]);
    expect(report.errors).toHaveLength(1);
    expect(report.errors[0].inferenceId).toBe('.elser-2-elasticsearch');
    expect(typeof report.errors[0].error).toBe('string');
  });

  it('adds endpoint to errors when inference.get rejects with a plain Error', async () => {
    client.inference.get.mockRejectedValueOnce(new Error('network timeout'));

    const report = await ensureInferenceEndpoints(client, ['custom-endpoint']);

    expect(report.errors).toEqual([{ inferenceId: 'custom-endpoint', error: 'network timeout' }]);
  });

  it('adds endpoint to errors when inference.get rejects with a non-Error value', async () => {
    client.inference.get.mockRejectedValueOnce('unexpected string rejection');

    const report = await ensureInferenceEndpoints(client, ['custom-endpoint']);

    expect(report.errors[0].inferenceId).toBe('custom-endpoint');
    expect(report.errors[0].error).toBe('unexpected string rejection');
  });

  it('handles multiple endpoints independently: checked + missing + error in one call', async () => {
    client.inference.get
      .mockResolvedValueOnce({ endpoints: [] } as any) // first: exists
      .mockRejectedValueOnce(createResponseError(404)) // second: missing
      .mockRejectedValueOnce(new Error('permission denied')); // third: error

    const report = await ensureInferenceEndpoints(client, [
      '.elser-2-elasticsearch',
      '.multilingual-e5-small-elasticsearch',
      'custom-endpoint',
    ]);

    expect(report.checked).toEqual(['.elser-2-elasticsearch']);
    expect(report.missing).toEqual(['.multilingual-e5-small-elasticsearch']);
    expect(report.errors).toEqual([{ inferenceId: 'custom-endpoint', error: 'permission denied' }]);
  });

  it('never throws even when multiple endpoints fail', async () => {
    client.inference.get
      .mockRejectedValueOnce(createResponseError(404))
      .mockRejectedValueOnce(new Error('boom'))
      .mockRejectedValueOnce(createResponseError(503));

    await expect(ensureInferenceEndpoints(client, ['a', 'b', 'c'])).resolves.toEqual({
      checked: [],
      missing: ['a'],
      errors: [
        { inferenceId: 'b', error: 'boom' },
        { inferenceId: 'c', error: expect.any(String) },
      ],
    });
  });
});
