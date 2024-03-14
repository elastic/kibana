/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

require('core-js/stable');
require('@babel/runtime/regenerator');

if (typeof window.Event === 'object') {
  // IE11 doesn't support unknown event types, required by react-use
  // https://github.com/streamich/react-use/issues/73
  window.Event = CustomEvent;
}

require('whatwg-fetch');
require('symbol-observable');

/**
 * @description Adapted from https://github.com/jantimon/remote-web-worker/blob/main/src/index.ts
 * with a modification to check that the requested worker url isn't already a blob, because of how workers are loaded for ace editor
 */
typeof window !== 'undefined' &&
  // eslint-disable-next-line no-global-assign
  (Worker = ((BaseWorker) =>
    class Worker extends BaseWorker {
      constructor(scriptURL, options) {
        const url = String(scriptURL);
        super(
          // Check if the URL is remote
          url.includes('://') && !url.startsWith(window.location.origin) && !url.startsWith('blob:') // to bootstrap the actual script to work around the same origin policy.
            ? URL.createObjectURL(
                new Blob(
                  [
                    // Replace the `importScripts` function with
                    // a patched version that will resolve relative URLs
                    // to the remote script URL.
                    //
                    // Without a patched `importScripts` Webpack 5 generated worker chunks will fail with the following error:
                    //
                    // Uncaught (in promise) DOMException: Failed to execute 'importScripts' on 'WorkerGlobalScope':
                    // The script at 'http://some.domain/worker.1e0e1e0e.js' failed to load.
                    //
                    // For minification, the inlined variable names are single letters:
                    // i = original importScripts
                    // a = arguments
                    // u = URL
                    `importScripts=((i)=>(...a)=>i(...a.map((u)=>''+new URL(u,"${url}"))))(importScripts);importScripts("${url}")`,
                  ],
                  {
                    type: 'text/javascript',
                  }
                )
              )
            : scriptURL,
          options
        );
      }
    })(Worker));
