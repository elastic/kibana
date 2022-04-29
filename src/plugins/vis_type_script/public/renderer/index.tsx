/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useEffect, useState, useMemo } from 'react';
import { createEndpoint, fromIframe } from '@remote-ui/rpc';

import './index.scss';
import { IExternalUrl } from '@kbn/core/public';
import {
  ESSearchOptions,
  VisTypeScriptKibanaApi,
  ESSearchResponse,
  ESSearchRequest,
  SQLSearchRequest,
  SQLSearchOptions,
  SQLSearchResponse,
} from '../kibana_api';

export const KIBANA_API_CONSTANT_NAME = 'KIBANA';

const getSandboxDocument = (script: string, dependencies: string[], nonce: string) => {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta http-equiv="content-security-policy" content="default-src none; script-src 'nonce-${nonce}'">
        ${dependencies
          .map((dependency) => `<script nonce="${nonce}">${dependency}</script>`)
          .join('')}
        <script nonce="${nonce}" type="module">
          //  TODO: probably can't leave this using type=module
          import { createEndpoint, fromInsideIframe } from "https://unpkg.com/@remote-ui/rpc@1.3.0/index.mjs";

          const endpoint = createEndpoint(fromInsideIframe());

          let onResize = () => {};

          const ${KIBANA_API_CONSTANT_NAME} = {
            searchEs: (payload, options) => {
              return  endpoint.call.esSearch(payload, options);
            },
            searchSql: (payload, options) => {
              return  endpoint.call.sqlSearch(payload, options);
            },
            addFilter: (query, index, alias) => {
              return endpoint.call.addFilter(query, index, alias);
            },
            removeFilter: (query, index) => {
              return endpoint.call.removeFilter(query, index);
            },
            removeAllFilters: () => {
              endpoint.call.removeAllFilters();
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
          function handleGlobalError(e) {
            console.error(e);
            // TODO a nicer error:
            document.body.innerHTML = "<h1>" + (e.reason || e.message || e).toString() + "</h1>" + "<code>" + (e.reason || e).stack || '' + "</code>";
          }
          window.addEventListener('error', handleGlobalError);
          window.addEventListener('unhandledrejection', handleGlobalError);
        </script>

        <script nonce="${nonce}">window.addEventListener('load', async () => {${script}})</script>
      </head>
      <body></body>
    <html>
    `;
};

const loadDependencies = (urls: string[]) => {
  return Promise.all(urls.map((url) => fetch(url).then((res) => res.text())));
};

export const ScriptRenderer: React.FunctionComponent<{
  script: string;
  dependencyUrls: string[];
  kibanaApi: VisTypeScriptKibanaApi;
  validateUrl: IExternalUrl['validateUrl'];
  nonce: string;
}> = ({
  script: visualizationScript,
  dependencyUrls,
  kibanaApi,
  validateUrl,
  nonce,
}: {
  script: string;
  dependencyUrls: string[];
  kibanaApi: VisTypeScriptKibanaApi;
  validateUrl: IExternalUrl['validateUrl'];
  nonce: string;
}) => {
  const iframeRef = React.useRef<HTMLIFrameElement | null>(null);

  useEffect(() => {
    if (!iframeRef.current) throw new Error('Iframe init error');
    const iframeEl = iframeRef.current;
    const endpoint = createEndpoint(fromIframe(iframeEl, { terminate: false }));

    endpoint.expose({
      esSearch: async (
        payload: ESSearchRequest,
        options?: ESSearchOptions
      ): Promise<ESSearchResponse> => {
        return kibanaApi.esSearch(payload, options);
      },
      sqlSearch: async (
        payload: SQLSearchRequest,
        options?: SQLSearchOptions
      ): Promise<SQLSearchResponse> => {
        return kibanaApi.sqlSearch(payload, options);
      },
      addFilter: (query: any, indexName?: string, alias?: string) => {
        return kibanaApi.addFilter(query, indexName, alias);
      },
      removeFilter: (query: any, indexName?: string) => {
        return kibanaApi.removeFilter(query, indexName);
      },
      removeAllFilters: () => {
        kibanaApi.removeAllFilters();
      },
      setTimeRange: () => {},
    });

    return () => {
      endpoint.terminate();
    };
  }, [kibanaApi]);

  const [dependencies, setDependencies] = useState<string[]>([]);

  useEffect(() => {
    loadDependencies(dependencyUrls.filter((url) => validateUrl(url) !== null)).then(
      (deps: string[]) => setDependencies(deps)
    );
  }, [dependencyUrls, validateUrl]);

  const sandboxDocument = useMemo(
    () => getSandboxDocument(visualizationScript, dependencies, nonce),
    [visualizationScript, dependencies, nonce]
  );

  return (
    <iframe
      ref={iframeRef}
      className="script-based-visualization-renderer"
      title="script-based-visualization-renderer"
      srcDoc={sandboxDocument}
      sandbox="allow-scripts"
    />
  );
};
