/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as url from 'url';
import { trimStart, trimEnd } from 'lodash';

import { proxyRequest } from '../../../../../lib';

function toURL(base: string, path: string) {
  const urlResult = new url.URL(`${trimEnd(base, '/')}/${trimStart(path, '/')}`);
  // Appending pretty here to have Elasticsearch do the JSON formatting, as doing
  // in JS can lead to data loss (7.0 will get munged into 7, thus losing indication of
  // measurement precision)
  // if (!urlResult.searchParams.get('pretty')) {
  //   urlResult.searchParams.append('pretty', 'true');
  // }
  return urlResult;
}

export const handleKibanaRequest = async ({
  method,
  serverUri,
  apiPath,
  body,
  query,
  headers,
  proxyHeaders,
  response,
  log,
  requestHeaders,
}) => {
  const uri = toURL(serverUri, apiPath);
  const kibanaIncomingMessage = await proxyRequest({
    method: method.toLowerCase() as 'get' | 'post' | 'put' | 'delete' | 'patch' | 'head',
    headers: requestHeaders,
    uri,
    timeout: 1000,
    payload: body,
    // rejectUnauthorized,
    // agent,
  });

  const {
    statusCode,
    statusMessage,
    headers: { warning },
  } = kibanaIncomingMessage!;
  
  return response.custom({
    statusCode: statusCode!,
    body: kibanaIncomingMessage!,
    headers: {
      warning: warning || '',
    },
  });
};
