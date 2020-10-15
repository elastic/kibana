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

/* eslint-disable max-classes-per-file */

export const mockXMLHttpRequest = (): {
  xhr: XMLHttpRequest;
  XMLHttpRequest: typeof window.XMLHttpRequest;
} => {
  class MockXMLHttpRequest implements XMLHttpRequest {
    DONE = 0;
    HEADERS_RECEIVED = 0;
    LOADING = 0;
    OPENED = 0;
    UNSENT = 0;
    abort = jest.fn();
    addEventListener = jest.fn();
    dispatchEvent = jest.fn();
    getAllResponseHeaders = jest.fn();
    getResponseHeader = jest.fn();
    onabort = jest.fn();
    onerror = jest.fn();
    onload = jest.fn();
    onloadend = jest.fn();
    onloadstart = jest.fn();
    onprogress = jest.fn();
    onreadystatechange = jest.fn();
    ontimeout = jest.fn();
    open = jest.fn();
    overrideMimeType = jest.fn();
    readyState = 0;
    removeEventListener = jest.fn();
    response = null;
    responseText = '';
    responseType = null as any;
    responseURL = '';
    responseXML = null;
    send = jest.fn();
    setRequestHeader = jest.fn();
    status = 0;
    statusText = '';
    timeout = 0;
    upload = null as any;
    withCredentials = false;
  }

  const xhr = new MockXMLHttpRequest();

  return {
    xhr,
    XMLHttpRequest: class {
      constructor() {
        return xhr;
      }
    } as any,
  };
};
