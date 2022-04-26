/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { createEndpoint, fromIframe } from '@remote-ui/rpc';

import './index.scss';

export const KIBANA_API_CONSTANT_NAME = 'KIBANA_API';

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

          const ${KIBANA_API_CONSTANT_NAME} = {
            searchEs: () => {
              console.log('Calling search inside an iframe')
              endpoint.call.searchEs();
            }
          }

          endpoint.expose({
             onUpdate: () => {
                console.log('Running an update from an iframe')
             }
          })


          window.${KIBANA_API_CONSTANT_NAME} = ${KIBANA_API_CONSTANT_NAME};
        </script>

        <script nonce="${nonce}">window.addEventListener('load', () => {${script}})</script>
      </head>
      <body></body>
    <html>
    `;
};

export const ScriptRenderer: React.FunctionComponent<{ script: string }> = ({
  script: visualizationScript,
}: {
  script: string;
}) => {
  const iframeRef = React.useRef<HTMLIFrameElement | null>(null);

  React.useEffect(() => {
    if (!iframeRef.current) throw new Error('Iframe init error');
    const iframeEl = iframeRef.current;
    const endpoint = createEndpoint<{ onUpdate: () => void }>(fromIframe(iframeEl));

    endpoint.expose({
      searchEs: () => {
        // eslint-disable-next-line no-console
        console.log('Running search from parent');
      },
    });

    // eslint-disable-next-line no-console
    console.log('Calling on update from parent');
    endpoint.call.onUpdate();
  }, []);

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
