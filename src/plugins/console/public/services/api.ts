/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { sendRequest } from '../services/use_request';

export async function convertRequestToLanguage(method: string, path: string, language:string, body: string[]) {
  return sendRequest({
    path: `/api/console/convert_request_to_language`,
    method: 'post',
    query: { method, path, language },
    body,
  });
}
