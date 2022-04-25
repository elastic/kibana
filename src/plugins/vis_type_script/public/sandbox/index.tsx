/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';

const getSandboxDocument = (script: string) => {
  // may be possible to remove this iframe-level nonce once we can use the top-level CSP
  // see https://github.com/elastic/kibana/issues/101579 for status tracking
  const nonce = crypto.randomUUID();
  const d3Url = 'https://unpkg.com/d3@7.4.4/dist/d3.min.js';

  const onLoadScript = `window.addEventListener('load', () => {
    ${script}
  })`;

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta http-equiv="content-security-policy" content="default-src none; script-src 'nonce-${nonce}' ${d3Url}">
        <script src="${d3Url}"></script>
        <script nonce="${nonce}">${onLoadScript}</script>
      </head>
      
      <body>
        <canvas></canvas>
      </body>
    <html>
    `;
};

export const VisSandbox: React.FunctionComponent<{ script: string }> = ({
  script: visualizationScript,
}: {
  script: string;
}) => {
  return (
    <iframe
      title="script-based-visualization-sandbox"
      srcDoc={getSandboxDocument(visualizationScript)}
      sandbox="allow-scripts"
    />
  );
};
