/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EsError } from './es_error';

describe('EsError', () => {
  it('contains the same body as the wrapped error', () => {
    const error = {
      statusCode: 500,
      message: 'nope',
      attributes: {
        error: {
          type: 'top_level_exception_type',
          reason: 'top-level reason',
        },
      },
    } as any;
    const esError = new EsError(error);

    expect(typeof esError.attributes).toEqual('object');
    expect(esError.attributes).toEqual(error.attributes);
  });

  it('contains some explanation of the error in the message', () => {
    // error taken from Vega's issue
    const error = {
      message:
        'x_content_parse_exception: [x_content_parse_exception] Reason: [1:78] [date_histogram] failed to parse field [calendar_interval]',
      statusCode: 400,
      attributes: {
        root_cause: [
          {
            type: 'x_content_parse_exception',
            reason: '[1:78] [date_histogram] failed to parse field [calendar_interval]',
          },
        ],
        type: 'x_content_parse_exception',
        reason: '[1:78] [date_histogram] failed to parse field [calendar_interval]',
        caused_by: {
          type: 'illegal_argument_exception',
          reason: 'The supplied interval [2q] could not be parsed as a calendar interval.',
        },
      },
    } as any;
    const esError = new EsError(error);
    expect(esError.message).toEqual(
      'EsError: The supplied interval [2q] could not be parsed as a calendar interval.'
    );
  });
});
