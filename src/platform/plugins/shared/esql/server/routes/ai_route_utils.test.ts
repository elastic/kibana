/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { KibanaRequest, KibanaResponseFactory, Logger } from '@kbn/core/server';
import type { InferenceServerStart } from '@kbn/inference-plugin/server';
import { failureResponse, getChatModelForRequest, toUsableQuery } from './ai_route_utils';

jest.mock('./helpers', () => ({
  resolveConnectorId: jest.fn(),
}));

const { resolveConnectorId } = jest.requireMock('./helpers');

describe('toUsableQuery', () => {
  it('trims the query the model gave', () => {
    expect(toUsableQuery('  FROM b  ', 'FROM a')).toBe('FROM b');
  });

  it('has nothing for an empty query, or for the same query written another way', () => {
    expect(toUsableQuery('   ', 'FROM a')).toBeNull();
    expect(toUsableQuery('FROM  a\n| LIMIT 1', 'FROM a | LIMIT 1')).toBeNull();
  });
});

describe('getChatModelForRequest', () => {
  const chatModel = {};
  const getChatModel = jest.fn().mockResolvedValue(chatModel);
  const inference = { getChatModel } as unknown as InferenceServerStart;
  const request = {} as KibanaRequest;

  beforeEach(() => jest.clearAllMocks());

  it('gives the model of the connector that was found', async () => {
    resolveConnectorId.mockResolvedValue('connector-1');

    await expect(getChatModelForRequest({ inference, request })).resolves.toBe(chatModel);
    expect(getChatModel).toHaveBeenCalledWith({
      request,
      connectorId: 'connector-1',
      chatModelOptions: {},
    });
  });

  it('gives nothing, and asks for no model, when no connector is set up', async () => {
    resolveConnectorId.mockResolvedValue(undefined);

    await expect(getChatModelForRequest({ inference, request })).resolves.toBeUndefined();
    expect(getChatModel).not.toHaveBeenCalled();
  });
});

describe('failureResponse', () => {
  const logger = { error: jest.fn() } as unknown as Logger;
  const response = {
    forbidden: jest.fn((options) => ({ status: 403, ...options })),
    customError: jest.fn((options) => options),
  } as unknown as KibanaResponseFactory;
  const respondTo = (error: unknown) =>
    failureResponse({ error, action: 'testing', logger, response });

  beforeEach(() => jest.clearAllMocks());

  it('answers 403 for a license problem', () => {
    const error = Object.assign(new Error('Needs a license'), { reason: 'license_expired' });

    expect(respondTo(error)).toMatchObject({ status: 403, body: { message: 'Needs a license' } });
  });

  it('answers 500 for any other failure, an error or not, and logs it', () => {
    expect(respondTo(new Error('boom'))).toEqual({ statusCode: 500, body: { message: 'boom' } });
    expect(respondTo('plain text')).toEqual({ statusCode: 500, body: { message: 'plain text' } });
    expect(logger.error).toHaveBeenCalledWith('ES|QL testing failed: boom');
  });

  it('does not take any error with a reason for a license problem', () => {
    const error = Object.assign(new Error('x'), { reason: 'something_else' });

    expect(respondTo(error)).toMatchObject({ statusCode: 500 });
  });
});
