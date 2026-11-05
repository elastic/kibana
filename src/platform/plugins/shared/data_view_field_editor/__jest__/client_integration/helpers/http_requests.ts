/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { httpServiceMock } from '@kbn/core/public/mocks';

type HttpResponse = Record<string, any> | any[];

const registerHttpRequestMockHelpers = (
  httpSetup: ReturnType<typeof httpServiceMock.createStartContract>
) => {
  const setFieldPreviewResponse = (response?: HttpResponse, error?: any, delayResponse = false) => {
    const body = error ? JSON.stringify(error.body) : response;

    httpSetup.post.mockImplementation(() => {
      if (delayResponse) {
        return new Promise((resolve) => {
          setTimeout(() => resolve({ data: body }), 1000);
        });
      } else {
        return Promise.resolve({ data: body });
      }
    });
  };

  /**
   * Makes every field preview request stay pending until the test resolves it manually,
   * which allows to exercise a response that arrives after the form values have changed.
   */
  const deferFieldPreviewResponses = () => {
    const pendingResolvers: Array<(body: HttpResponse) => void> = [];

    httpSetup.post.mockImplementation(
      () =>
        new Promise((resolve) => {
          pendingResolvers.push((body) => resolve({ data: body }));
        })
    );

    return {
      getRequestCount: () => pendingResolvers.length,
      resolveRequest: (index: number, body: HttpResponse) => pendingResolvers[index](body),
    };
  };

  return {
    deferFieldPreviewResponses,
    setFieldPreviewResponse,
  };
};

export const init = () => {
  const httpSetup = httpServiceMock.createSetupContract();
  const httpRequestsMockHelpers = registerHttpRequestMockHelpers(httpSetup);

  return {
    httpSetup,
    httpRequestsMockHelpers,
  };
};
