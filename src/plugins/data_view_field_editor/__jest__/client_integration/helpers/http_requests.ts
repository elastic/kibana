/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
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
  return {
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
