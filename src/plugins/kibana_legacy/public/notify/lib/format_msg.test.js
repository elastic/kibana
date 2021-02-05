/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { formatMsg } from './format_msg';
import expect from '@kbn/expect';

describe('formatMsg', () => {
  test('should prepend the second argument to result', () => {
    const actual = formatMsg('error message', 'unit_test');

    expect(actual).to.equal('unit_test: error message');
  });

  test('should handle a simple string', () => {
    const actual = formatMsg('error message');

    expect(actual).to.equal('error message');
  });

  test('should handle a simple Error object', () => {
    const err = new Error('error message');
    const actual = formatMsg(err);

    expect(actual).to.equal('error message');
  });

  test('should handle a simple Angular $http error object', () => {
    const err = {
      data: {
        statusCode: 403,
        error: 'Forbidden',
        message:
          '[security_exception] action [indices:data/read/msearch] is unauthorized for user [user]',
      },
      status: 403,
      config: {},
      statusText: 'Forbidden',
    };
    const actual = formatMsg(err);

    expect(actual).to.equal(
      'Error 403 Forbidden: [security_exception] action [indices:data/read/msearch] is unauthorized for user [user]'
    );
  });

  test('should handle an extended elasticsearch error', () => {
    const err = {
      resp: {
        error: {
          root_cause: [
            {
              reason: 'I am the detailed message',
            },
          ],
        },
      },
    };

    const actual = formatMsg(err);

    expect(actual).to.equal('I am the detailed message');
  });
});
