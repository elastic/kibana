/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import $ from 'jquery';
import { stringify } from 'query-string';

const esVersion: string[] = [];

export function getVersion() {
  return esVersion;
}

export function getContentType(body: any) {
  if (!body) return;
  return 'application/json';
}

export function send(method: string, path: string, data: any) {
  const wrappedDfd = $.Deferred();

  const options: JQuery.AjaxSettings = {
    url: '../api/console/proxy?' + stringify({ path, method }, { sort: false }),
    headers: {
      'kbn-xsrf': 'kibana',
    },
    data,
    contentType: getContentType(data),
    cache: false,
    crossDomain: true,
    type: 'POST',
    dataType: 'text', // disable automatic guessing
  };

  $.ajax(options).then(
    (responseData: any, textStatus: string, jqXHR: any) => {
      wrappedDfd.resolveWith({}, [responseData, textStatus, jqXHR]);
    },
    ((jqXHR: any, textStatus: string, errorThrown: Error) => {
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
