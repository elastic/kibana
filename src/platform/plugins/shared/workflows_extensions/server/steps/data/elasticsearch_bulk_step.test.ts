/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Under the Elastic License 2.0, the
 * GNU AGPLv3, or the SSPLv1, at your election.
 */
import { elasticsearchBulkStepDefinition } from './elasticsearch_bulk_step';

const docs = (n: number) => Array.from({ length: n }, (_, i) => ({ id: `d${i}` }));

const makeContext = (bulkImpl: jest.Mock) =>
  ({
    input: {} as Record<string, unknown>,
    logger: { warn: jest.fn(), debug: jest.fn(), info: jest.fn(), error: jest.fn() },
    contextManager: {
      getScopedEsClient: () => ({ bulk: bulkImpl }),
    },
  }) as any;

const run = (input: Record<string, unknown>, bulkImpl: jest.Mock) => {
  const ctx = makeContext(bulkImpl);
  ctx.input = input;
  return (elasticsearchBulkStepDefinition as any).handler(ctx);
};

describe('elasticsearch.bulk step (WF-004)', () => {
  it('indexes all documents in one batch and reports counts', async () => {
    const bulk = jest.fn().mockResolvedValue({ errors: false, items: [] });
    const result = await run({ index: 't', documents: docs(3) }, bulk);
    expect(result.output).toEqual({ indexed: 3, failed: 0, batches: 1 });
    expect(bulk).toHaveBeenCalledTimes(1);
  });

  it('splits into batches of batch_size', async () => {
    const bulk = jest.fn().mockResolvedValue({ errors: false, items: [] });
    const result = await run({ index: 't', documents: docs(5), batch_size: 2 }, bulk);
    expect(result.output).toEqual({ indexed: 5, failed: 0, batches: 3 });
    expect(bulk).toHaveBeenCalledTimes(3);
  });

  it('counts partial failures and warns', async () => {
    const bulk = jest.fn().mockResolvedValue({
      errors: true,
      items: [
        {},
        { index: { error: { type: 'mapper_parsing_exception', reason: 'bad field' } } },
      ],
    });
    const ctx = makeContext(bulk);
    ctx.input = { index: 't', documents: docs(2) };
    const result = await (elasticsearchBulkStepDefinition as any).handler(ctx);
    expect(result.output).toEqual({ indexed: 1, failed: 1, batches: 1 });
    expect(ctx.logger.warn).toHaveBeenCalled();
  });

  it('errors when every item fails', async () => {
    const bulk = jest.fn().mockResolvedValue({
      errors: true,
      items: [{ index: { error: { type: 'es', reason: 'nope' } } }],
    });
    const result = await run({ index: 't', documents: docs(1) }, bulk);
    expect(result.error).toBeInstanceOf(Error);
    expect(result.error.message).toContain('all 1 items failed');
  });

  it('passes refresh=wait_for when require_refresh', async () => {
    const bulk = jest.fn().mockResolvedValue({ errors: false, items: [] });
    await run({ index: 't', documents: docs(1), require_refresh: true }, bulk);
    expect(bulk.mock.calls[0][0].refresh).toBe('wait_for');
  });
});
