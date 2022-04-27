/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useEffect } from 'react';
import { createEndpoint, fromIframe } from '@remote-ui/rpc';

import './index.scss';
import type { SearchResponse, AggregationsAggregate } from '@elastic/elasticsearch/lib/api/types';
import type { SearchRequest } from 'src/plugins/data/common';
import { SearchOptions, VisTypeScriptKibanaApi } from '../kibana_api';

export const KIBANA_API_CONSTANT_NAME = 'KIBANA';

const getSandboxDocument = (script: string) => {
  // may be possible to remove this iframe-level nonce once we can use the top-level CSP
  // see https://github.com/elastic/kibana/issues/101579 for status tracking
  const nonce = crypto.randomUUID();
  const d3Url = 'https://unpkg.com/d3@3.4.0/d3.min.js';

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta http-equiv="content-security-policy" content="default-src none; script-src 'nonce-${nonce}' ${d3Url}">
        <script src="${d3Url}"></script>
        <script nonce="${nonce}" type="module">
          //  TODO: probably can't leave this using type=module
          import { createEndpoint, fromInsideIframe } from "https://unpkg.com/@remote-ui/rpc@1.3.0/index.mjs";

          const endpoint = createEndpoint(fromInsideIframe());

          const defer = () => {
            const ret = {};

            ret.promise = new Promise((resolve, reject) => {
              ret.resolve = resolve;
              ret.reject = reject;
            });

            return ret;
          }

          const searchDeferrals = {};
          let searchCounter = 0;

          endpoint.expose({
            onSearchResult: (searchId, result) => {
              searchDeferrals[searchId].resolve(result);
            }
          });

          let onResize = () => {};

          const ${KIBANA_API_CONSTANT_NAME} = {
            searchEs: (payload, options) => {
              const searchId = searchCounter;
              searchCounter++;

              searchDeferrals[searchId] = defer();
              
              endpoint.call.esSearch(searchId, payload, options);

              return searchDeferrals[searchId].promise;
            },
            subscribeToResize: (fn) => {
              onResize = fn;
            },
            getWindowDimensions: () => {
              return { width: window.innerWidth, height: window.innerHeight };
            }
          }

          window.${KIBANA_API_CONSTANT_NAME} = ${KIBANA_API_CONSTANT_NAME};


          window.addEventListener('resize', () => onResize(window.innerWidth, window.innerHeight));
        </script>

        <script type="module" nonce="${nonce}">window.addEventListener('load', async () => {${script}})</script>
      </head>
      <body></body>
    <html>
    `;
};

export const ScriptRenderer: React.FunctionComponent<{
  script: string;
  dependencyUrls: string[];
  kibanaApi: VisTypeScriptKibanaApi;
}> = ({
  script: visualizationScript,
  dependencyUrls,
  kibanaApi,
}: {
  script: string;
  dependencyUrls: string[];
  kibanaApi: VisTypeScriptKibanaApi;
}) => {
  const iframeRef = React.useRef<HTMLIFrameElement | null>(null);

  useEffect(() => {
    if (!iframeRef.current) throw new Error('Iframe init error');
    const iframeEl = iframeRef.current;
    const endpoint = createEndpoint<{
      onSearchResult: (
        searchId: number,
        result: SearchResponse<unknown, Record<string, AggregationsAggregate>>
      ) => {};
    }>(fromIframe(iframeEl, { terminate: false }));

    endpoint.expose({
      esSearch: async (searchId: number, payload: SearchRequest, options?: SearchOptions) => {
        const searchResult = await kibanaApi.esSearch(payload, options);
        endpoint.call.onSearchResult(searchId, searchResult);
      },
    });

    return () => {
      endpoint.terminate();
    };
  }, [kibanaApi]);

  return (
    <iframe
      ref={iframeRef}
      className="script-based-visualization-renderer"
      title="script-based-visualization-renderer"
      srcDoc={getSandboxDocument(visualizationScript)}
      sandbox="allow-scripts"
    />
  );
};
