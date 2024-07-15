/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import * as Either from 'fp-ts/lib/Either';
import * as TaskEither from 'fp-ts/lib/TaskEither';
import { elasticsearchClientMock } from '@kbn/core-elasticsearch-client-server-mocks';
import { safeWriteBlock } from './safe_write_block';

jest.mock('./set_write_block');
import { setWriteBlock } from './set_write_block';

const setWriteBlockMock = setWriteBlock as jest.MockedFn<typeof setWriteBlock>;

describe('safeWriteBlock', () => {
  beforeEach(() => {
    setWriteBlockMock.mockReset();
    setWriteBlockMock.mockReturnValueOnce(
      TaskEither.fromEither(Either.right('set_write_block_succeeded' as const))
    );
  });

  const client = elasticsearchClientMock.createInternalClient();
  it('returns a Left response if source and target indices match', async () => {
    const task = safeWriteBlock({
      client,
      sourceIndex: '.kibana_8.15.0_001',
      targetIndex: '.kibana_8.15.0_001',
    });
    const res = await task();
    expect(res).toEqual(Either.left({ type: 'source_equals_target', index: '.kibana_8.15.0_001' }));
    expect(setWriteBlockMock).not.toHaveBeenCalled();
  });

  it('calls setWriteBlock if indices are different', async () => {
    const task = safeWriteBlock({
      client,
      sourceIndex: '.kibana_7.13.0_001',
      targetIndex: '.kibana_8.15.0_001',
      timeout: '28s',
    });
    const res = await task();
    expect(res).toEqual(Either.right('set_write_block_succeeded' as const));
    expect(setWriteBlockMock).toHaveBeenCalledTimes(1);
    expect(setWriteBlockMock).toHaveBeenCalledWith({
      client,
      index: '.kibana_7.13.0_001',
      timeout: '28s',
    });
  });
});
