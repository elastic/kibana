/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { HttpStart } from '@kbn/core/public';
import { EXPLAIN_ERROR_ROUTE } from '@kbn/esql-types';
import { checkErrorExplanationAvailable } from './explain_esql_error';

const buildHttp = (...answers: Array<{ available?: boolean } | Error>) => {
  const get = jest.fn();
  answers.forEach((answer) =>
    answer instanceof Error ? get.mockRejectedValueOnce(answer) : get.mockResolvedValueOnce(answer)
  );
  return { get } as unknown as Pick<HttpStart, 'get'> & { get: jest.Mock };
};

describe('checkErrorExplanationAvailable', () => {
  it('asks the server and keeps a positive answer, so it asks once per http service', async () => {
    const http = buildHttp({ available: true });

    await expect(checkErrorExplanationAvailable(http)).resolves.toBe(true);
    await expect(checkErrorExplanationAvailable(http)).resolves.toBe(true);

    expect(http.get).toHaveBeenCalledTimes(1);
    expect(http.get).toHaveBeenCalledWith(EXPLAIN_ERROR_ROUTE);
  });

  it('asks again after an unavailable answer, in case a connector or a license was added since', async () => {
    const http = buildHttp({ available: false }, { available: true });

    await expect(checkErrorExplanationAvailable(http)).resolves.toBe(false);
    await expect(checkErrorExplanationAvailable(http)).resolves.toBe(true);

    expect(http.get).toHaveBeenCalledTimes(2);
  });

  it('treats a failed check as unavailable and asks again next time', async () => {
    const http = buildHttp(new Error('boom'), { available: true });

    await expect(checkErrorExplanationAvailable(http)).resolves.toBe(false);
    await expect(checkErrorExplanationAvailable(http)).resolves.toBe(true);
  });

  it('shares one request between callers that ask at the same time', async () => {
    const http = buildHttp({ available: false });

    const answers = await Promise.all([
      checkErrorExplanationAvailable(http),
      checkErrorExplanationAvailable(http),
    ]);

    expect(answers).toEqual([false, false]);
    expect(http.get).toHaveBeenCalledTimes(1);
  });
});
