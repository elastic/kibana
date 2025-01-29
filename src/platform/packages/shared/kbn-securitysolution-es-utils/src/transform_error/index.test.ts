/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Boom from '@hapi/boom';
import { transformError } from '.';
import { BadRequestError } from '../bad_request_error';
import { errors } from '@elastic/elasticsearch';

describe('transformError', () => {
  test('returns transformed output error from boom object with a 500 and payload of internal server error', () => {
    const boom = new Boom.Boom('some boom message');
    const transformed = transformError(boom);
    expect(transformed).toEqual({
      message: 'An internal server error occurred',
      statusCode: 500,
    });
  });

  test('returns transformed output if it is some non boom object that has a statusCode', () => {
    const error: Error & { statusCode?: number } = {
      statusCode: 403,
      name: 'some name',
      message: 'some message',
    };
    const transformed = transformError(error);
    expect(transformed).toEqual({
      message: 'some message',
      statusCode: 403,
    });
  });

  test('returns a transformed message with the message set and statusCode', () => {
    const error: Error & { statusCode?: number } = {
      statusCode: 403,
      name: 'some name',
      message: 'some message',
    };
    const transformed = transformError(error);
    expect(transformed).toEqual({
      message: 'some message',
      statusCode: 403,
    });
  });

  test('transforms best it can if it is some non boom object but it does not have a status Code.', () => {
    const error: Error = {
      name: 'some name',
      message: 'some message',
    };
    const transformed = transformError(error);
    expect(transformed).toEqual({
      message: 'some message',
      statusCode: 500,
    });
  });

  test('it detects a BadRequestError and returns a status code of 400 from that particular error type', () => {
    const error: BadRequestError = new BadRequestError('I have a type error');
    const transformed = transformError(error);
    expect(transformed).toEqual({
      message: 'I have a type error',
      statusCode: 400,
    });
  });

  test('it detects a BadRequestError and returns a Boom status of 400', () => {
    const error: BadRequestError = new BadRequestError('I have a type error');
    const transformed = transformError(error);
    expect(transformed).toEqual({
      message: 'I have a type error',
      statusCode: 400,
    });
  });

  it('transforms a ResponseError returned by the elasticsearch client', () => {
    const error = {
      name: 'ResponseError',
      message: 'illegal_argument_exception',
      headers: {},
      body: {
        error: {
          type: 'illegal_argument_exception',
          reason: 'detailed explanation',
        },
      },
      meta: {} as unknown as errors.ResponseError['meta'],
      statusCode: 400,
    } as errors.ResponseError;
    const transformed = transformError(error);

    expect(transformed).toEqual({
      message: 'illegal_argument_exception: detailed explanation',
      statusCode: 400,
    });
  });
});
