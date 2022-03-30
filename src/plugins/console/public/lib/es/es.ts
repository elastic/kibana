/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import $ from 'jquery';
import { stringify } from 'query-string';

interface SendOptions {
  asSystemRequest?: boolean;
}

const esVersion: string[] = [];

export function getVersion() {
  return esVersion;
}

export function getContentType(body: unknown) {
  if (!body) return;
  return 'application/json';
}

export function send(
  method: string,
  path: string,
  data: string | object,
  { asSystemRequest }: SendOptions = {},
  withProductOrigin: boolean = false
) {
  const wrappedDfd = $.Deferred();

  const options: JQuery.AjaxSettings = {
    url:
      '../api/console/proxy?' +
      stringify({ path, method, ...(withProductOrigin && { withProductOrigin }) }, { sort: false }),
    headers: {
      'kbn-xsrf': 'kibana',
      ...(asSystemRequest && { 'kbn-system-request': 'true' }),
    },
    data,
    contentType: getContentType(data),
    cache: false,
    crossDomain: true,
    type: 'POST',
    dataType: 'text', // disable automatic guessing
  };

  if (path.includes('geo.coordinates')) {
    delete options.dataType;
    options.xhrFields = {
      responseType: 'arraybuffer',
    };
  }

  $.ajax(options).then(
    (responseData, textStatus: string, jqXHR: unknown) => {
      wrappedDfd.resolveWith({}, [responseData, textStatus, jqXHR]);
    },
    ((jqXHR: { status: number; responseText: string }, textStatus: string, errorThrown: Error) => {
      if (jqXHR.status === 0) {
        jqXHR.responseText =
          "\n\nFailed to connect to Console's backend.\nPlease check the Kibana server is up and running";
      }
      wrappedDfd.rejectWith({}, [jqXHR, textStatus, errorThrown]);
    }) as any
  );
  return wrappedDfd;
}

export function constructESUrl(baseUri: string, path: string) {
  baseUri = baseUri.replace(/\/+$/, '');
  path = path.replace(/^\/+/, '');
  return baseUri + '/' + path;
}
