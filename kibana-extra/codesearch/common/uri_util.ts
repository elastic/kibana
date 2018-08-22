/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Uri } from 'monaco-editor';

function isBrowser() {
  return typeof window !== 'undefined';
}

function removeSlash(s: string): string {
  if (s.startsWith('/')) {
    return removeSlash(s.substr(1));
  }
  return s;
}

export function parseLspUri(uri: Uri | string) {
  if (typeof uri === 'string') {
    let url;
    if (isBrowser()) {
      url = new URL(uri);
    } else {
      url = require('url').parse(uri);
    }
    return {
      revision: url.search.substr(1),
      file: url.hash.substr(1),
      schema: url.protocol,
      repoUri: removeSlash(`${url.hostname}${url.pathname}`),
    };
  } else {
    return {
      revision: uri.query,
      file: uri.fragment,
      schema: uri.scheme,
      repoUri: `${uri.authority}${uri.path}`,
    };
  }
}
