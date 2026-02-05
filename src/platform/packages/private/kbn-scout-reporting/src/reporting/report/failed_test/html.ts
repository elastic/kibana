/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import fs from 'fs';
import type { TestFailure } from './test_failure';

export const buildFailureHtml = (testFailure: TestFailure): string => {
  const {
    suite,
    title,
    target,
    command,
    location,
    owner,
    kibanaModule,
    duration,
    error,
    stdout,
    attachments,
  } = testFailure;

  const testDuration = duration < 1000 ? `${duration}ms` : `${(duration / 1000).toFixed(2)}s`;

  const screenshots = attachments
    .filter((a) => a.contentType.startsWith('image/'))
    .map((s) => {
      const base64 = fs.readFileSync(s.path!).toString('base64');
      const escapedName = (s.name || 'screenshot').replace(/"/g, '&quot;');
      return `
        <div class="screenshotContainer">
          <img class="screenshot img-fluid img-thumbnail" src="data:${s.contentType};base64,${base64}" alt="${escapedName}" />
        </div>
      `;
    });

  const errorStackTrace = error?.stack_trace || 'No stack trace available';

  return `
    <!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta http-equiv="Content-Security-Policy" content="default-src 'self' data: 'unsafe-inline'; img-src 'self' data:; style-src 'self' 'unsafe-inline';" />
    <style>
      /* Reset and base styles */
      * {
        box-sizing: border-box;
      }

      body {
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
        font-size: 14px;
        line-height: 1.6;
        margin: 0;
        padding: 0;
        background-color: #f8f9fa;
        color: #212529;
      }

      /* Container */
      .container {
        width: 100%;
        max-width: 1200px;
        margin: 0 auto;
        padding: 0 15px;
      }

      .my-5 {
        margin-top: 3rem;
        margin-bottom: 3rem;
      }

      /* Typography */
      h4, h5 {
        margin-top: 20px;
        margin-bottom: 10px;
        font-weight: 600;
        line-height: 1.2;
      }

      h4 {
        font-size: 1.5rem;
      }

      h5 {
        font-size: 1.25rem;
      }

      hr {
        margin: 20px 0;
        border: 0;
        border-top: 1px solid #dee2e6;
      }

      strong {
        font-weight: 600;
      }

      em {
        font-style: italic;
      }

      /* Tables */
      .table-details {
        width: 100%;
        margin-top: 15px;
        border-collapse: collapse;
        background-color: #fff;
      }

      .table-details td {
        padding: 12px;
        border: 1px solid #dee2e6;
        vertical-align: top;
      }

      .table-details tr td:first-child {
        background-color: #f8f9fa;
        width: 200px;
        font-weight: 600;
      }

      /* Pre and code */
      pre {
        font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, Courier, monospace;
        font-size: 0.9em;
        background-color: #f8f9fa;
        padding: 12px;
        border-radius: 5px;
        border: 1px solid #dee2e6;
        overflow-x: auto;
        white-space: pre-wrap;
        word-wrap: break-word;
        margin: 10px 0;
      }

      /* Error section background */
      .error-section {
        background-color: #fff5f5;
      }

      .error-section pre {
        background-color: #fff5f5;
        border-color: #fecaca;
      }

      /* Details and summary */
      details {
        margin: 10px 0;
        padding: 10px;
        border: 1px solid #dee2e6;
        border-radius: 5px;
        background-color: #fff;
      }

      summary {
        cursor: pointer;
        font-weight: 600;
        padding: 5px;
        user-select: none;
      }

      summary:hover {
        background-color: #f8f9fa;
      }

      /* Badge */
      .badge {
        display: inline-block;
        padding: 0.35em 0.65em;
        font-size: 0.75em;
        font-weight: 600;
        line-height: 1;
        color: #fff;
        text-align: center;
        white-space: nowrap;
        vertical-align: baseline;
        border-radius: 0.375rem;
      }

      .rounded-pill {
        border-radius: 50rem;
      }

      .bg-danger {
        background-color: #dc3545;
      }

      /* Links */
      a {
        color: #0d6efd;
        text-decoration: none;
      }

      a:hover {
        color: #0a58ca;
        text-decoration: underline;
      }

      /* Images */
      img {
        max-width: 100%;
        height: auto;
      }

      .img-fluid {
        max-width: 100%;
        height: auto;
      }

      .img-thumbnail {
        padding: 0.25rem;
        background-color: #fff;
        border: 1px solid #dee2e6;
        border-radius: 0.375rem;
      }

      img.screenshot {
        cursor: pointer;
        margin: 5px 0;
        transition: transform 0.2s;
      }

      img.screenshot:hover {
        transform: scale(1.02);
      }

      .screenshotContainer {
        margin: 15px 0;
        padding: 10px;
        background-color: #fff;
        border: 1px solid #dee2e6;
        border-radius: 5px;
      }

      .screenshotContainer:not(.expanded) img.screenshot {
        height: 200px;
        width: auto;
        object-fit: contain;
      }

      .screenshotContainer:not(.fs) img.screenshot.fs,
      .screenshotContainer:not(.fs) button.toggleFs.off,
      .screenshotContainer.fs img.screenshot:not(.fs),
      .screenshotContainer.fs button.toggleFs.on {
        display: none;
      }

      .screenshotContainer .toggleFs {
        background: none;
        border: none;
        margin: 0 0 0 5px;
        vertical-align: top;
        cursor: pointer;
        padding: 5px;
        font-size: 1.2em;
      }

      .screenshotContainer .toggleFs:hover {
        opacity: 0.7;
      }

      /* Sections */
      .section {
        margin-bottom: 20px;
        background-color: #fff;
        padding: 15px;
        border-radius: 5px;
        border: 1px solid #dee2e6;
      }

      .section h5 {
        margin-top: 0;
        margin-bottom: 10px;
        font-size: 1.1rem;
      }

      /* Compact info display */
      .info-grid {
        display: grid;
        grid-template-columns: auto 1fr;
        gap: 8px 12px;
        align-items: baseline;
      }

      .info-label {
        font-weight: 600;
        color: #495057;
        white-space: nowrap;
      }

      .info-value {
        color: #212529;
      }

      .inline-list {
        display: inline;
        margin: 0;
        padding: 0;
      }

      .owners-inline {
        display: inline-block;
        padding: 4px 8px;
        background-color: #e9ecef;
        border-radius: 3px;
        font-family: "SFMono-Regular", Consolas, monospace;
        font-size: 0.9em;
        margin: 0;
      }

      /* Plugin info */
      .plugin-info {
        margin-top: 10px;
      }

      /* Utility classes */
      main {
        display: block;
      }
    </style>
    <title>Scout Test Failure Report</title>
  </head>
  <body>
    <div class="container my-5">
      <main>
        <h4>Scout Test Failure Report</h4>
        <h5>Location: ${location}</h5>
        <hr />

        <div class="section">
          <h5>Test Details</h5>
          <div class="info-grid">
            <span class="info-label">Suite:</span>
            <span class="info-value">${suite}</span>

            <span class="info-label">Test:</span>
            <span class="info-value">${title}</span>

            <span class="info-label">Target:</span>
            <span class="info-value">${target}</span>

            <span class="info-label">Duration:</span>
            <span class="info-value">${testDuration}</span>

            <span class="info-label">Module:</span>
            <span class="info-value">${kibanaModule?.id} ${kibanaModule?.type}</span>

            <span class="info-label">Visibility:</span>
            <span class="info-value">${kibanaModule?.visibility} / ${kibanaModule?.group}</span>

            <span class="info-label">Owners:</span>
            <span class="info-value"><code class="owners-inline">${owner.join(', ')}</code></span>
          </div>
        </div>

        <div id="ci-links-placeholder">
          <!-- Placeholder for GitHub and Buildkite links -->
        </div>

        <div class="section">
          <h5>Command Line</h5>
          <pre>${command}</pre>
        </div>

        <div class="section error-section">
            <h5>Error Details</h5>
            <pre>${errorStackTrace}</pre>
        </div>

        <div class="section" id="tracked-branches-status">
          <strong>No failures found in tracked branches</strong>
        </div>

        <div class="section">
         <h5>Output Logs</h5>
          <details>
            <pre>${stdout || 'No output available'}</pre>
          </details>
        </div>

        <div class="section">
          <h5>Attachments</h5>
          ${screenshots.join('/n')}
        </div>
      </main>
    </div>
     <script type="text/javascript">
      /**
       * @param {HTMLElement} el
       * @param {(el: HTMLElement) => boolean} className
       */
      function findParent(el, test) {
        while (el) {
          if (test(el)) {
            return el
          }

          // stop if we iterate all the way up to the document body
          if (el.parentElement === document.body) {
            break
          }

          el = el.parentElement
        }

        return null
      }

      function isContainer(el) {
        return el.classList.contains('screenshotContainer')
      }

      function isButtonOrImg(el) {
        return el instanceof HTMLImageElement || el instanceof HTMLButtonElement
      }

      document.addEventListener('click', (event) => {
        const el = findParent(event.target, isButtonOrImg)

        if (el instanceof HTMLImageElement && el.classList.contains('screenshot')) {
          findParent(el, isContainer)?.classList.toggle('expanded')
        }

        if (el instanceof HTMLButtonElement && el.classList.contains('toggleFs')) {
          findParent(el, isContainer)?.classList.toggle('fs')
        }
      })
    </script>
  </body>
</html>
    `;
};
