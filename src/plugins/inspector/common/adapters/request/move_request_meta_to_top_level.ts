/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { RequestStatus, Response } from './types';

export function moveRequestMetaToTopLevel(status: RequestStatus, response: Response) {
  if (status === RequestStatus.ERROR) {
    const requestMeta = response.json?.err?.requestMeta;
    if (!requestMeta) {
      return response;
    }

    const json = {
      ...response.json,
      err: { ...response.json.err },
    };
    delete json.err.requestMeta;
    return {
      ...response,
      json,
      requestMeta,
    };
  }

  const requestMeta = response.json?.requestMeta;
  if (!requestMeta) {
    return response;
  }

  const json = { ...response.json };
  delete json.requestMeta;
  return {
    ...response,
    json,
    requestMeta,
  };
}
