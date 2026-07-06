/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export interface GraphConfig {
  readonly transparent: boolean;
}

/**
 * Builds the HTML page served to puppeteer for each workflow. Injects the YAML
 * and config as JSON-encoded globals so the browser entry can read them without
 * any XSS risk from special characters in the YAML content.
 */
export const buildPageHtml = (
  yamlString: string,
  config: GraphConfig,
  width: number,
  height: number
): string => {
  const escapedYaml = JSON.stringify(yamlString);
  const escapedConfig = JSON.stringify(config);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=${width},initial-scale=1" />
  <title>Workflow graph</title>
  <style>
    *, *::before, *::after {
      /* Suppress transitions/animations for deterministic screenshots */
      transition-duration: 0s !important;
      animation-duration: 0s !important;
    }
    html, body { margin: 0; padding: 0; width: ${width}px; height: ${height}px; overflow: hidden; }
    #root { width: ${width}px; height: ${height}px; }
  </style>
  <script>
    window.__WORKFLOW_YAML__ = ${escapedYaml};
    window.__GRAPH_CONFIG__ = ${escapedConfig};
  </script>
</head>
<body>
  <div id="root"></div>
  <script src="/bundle.js"></script>
</body>
</html>`;
};

/** The static index page served at GET / for manual browsing with --serve. */
export const buildIndexHtml = (entries: Array<{ name: string; index: number }>): string => {
  const links = entries
    .map((e) => `<li><a href="/w/${e.index}">${escapeHtml(e.name)}</a></li>`)
    .join('\n    ');
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Workflow graph previews</title>
  <style>
    body { font-family: sans-serif; padding: 24px; }
    li { margin: 6px 0; }
    a { color: #0b64dd; text-decoration: none; }
    a:hover { text-decoration: underline; }
  </style>
</head>
<body>
  <h1>Workflow graph previews</h1>
  <ul>
    ${links}
  </ul>
</body>
</html>`;
};

const escapeHtml = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
