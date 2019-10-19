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

// @ts-ignore
// import mappings from '../../../../../../public/quarantined/src/mappings';

/* eslint-disable no-console */

export interface InitializationArgs {
  url: string;
  input: any;
}

export function loadRemoteState({ url, input }: InitializationArgs) {
  const loadFrom = {
    url,
    // Having dataType here is required as it doesn't allow jQuery to `eval` content
    // coming from the external source thereby preventing XSS attack.
    dataType: 'text',
    kbnXsrfToken: false,
    headers: {},
  };

  if (/https?:\/\/api.github.com/.test(url)) {
    loadFrom.headers = { Accept: 'application/vnd.github.v3.raw' };
  }

  $.ajax(loadFrom).done(data => {
    input.update(data);
    input.moveToNextRequestEdge(true);
    input.highlightCurrentRequestsAndUpdateActionBar();
    input.updateActionsBar();
  });
  input.moveToNextRequestEdge(true);
}
