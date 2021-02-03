/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
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
