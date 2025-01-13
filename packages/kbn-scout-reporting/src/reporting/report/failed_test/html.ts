/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import fs from 'fs';
import { TestFailure } from './test_failure';

export const buildFailureHtml = (testFailure: TestFailure): string => {
  const {
    suite,
    title,
    target,
    command,
    location,
    owner,
    plugin,
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
      return `
        <div class="screenshotContainer">
          <img class="screenshot img-fluid img-thumbnail" src="data:image/png;base64,${base64}" alt="${s.name}"/>
        </div>
      `;
    });

  return `
    <!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <link
      href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.1/dist/css/bootstrap.min.css"
      rel="stylesheet"
      integrity="sha384-F3w7mX95PdgyTmZZMECAngseQB83DfGTowi0iMjiWaeVhAn4FJkqJByhZMI3AhiU"
      crossorigin="anonymous"
    />
    <style>
      body {
        font-family: Arial, sans-serif;
        font-size: 14px;
        line-height: 1.6;
        margin: 0;
        padding: 0;
        background-color: #f8f9fa;
      }

      h4, h5 {
        margin-top: 20px;
        margin-bottom: 10px;
      }

      hr {
        margin: 20px 0;
      }

      .table-details {
        width: 100%;
        margin-top: 15px;
        border: 1px solid #dee2e6;
      }

      .table-details td {
        padding: 8px;
        border: 1px solid #dee2e6;
      }

      .plugin-info {
        margin-top: 10px;
      }

      pre {
        font-size: 0.9em;
        background-color: #f8f9fa;
        padding: 10px;
        border-radius: 5px;
        border: 1px solid #dee2e6;
        overflow-x: auto;
      }


      img.screenshot {
        cursor: pointer;
        margin: 5px 0;
      }
      .screenshotContainer:not(.expanded) img.screenshot {
        height: 200px;
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
      }

      .section {
        margin-bottom: 20px;
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
          <table class="table-details">
            <tr>
              <td><strong>Suite Title</strong></td>
              <td>${suite}</td>
            </tr>
            <tr>
              <td><strong>Test Title</strong></td>
              <td>${title}</td>
            </tr>
            <tr>
              <td><strong>Execution Details</strong></td>
              <td>
                Target: <em>${target}</em>,
                Duration: <em>${testDuration}</em>
              </td>
            </tr>
            <tr>
              <td><strong>Plugin</strong></td>
              <td>
                ID: <em>${plugin?.id}</em>,
                Visibility: <em>${plugin?.visibility}</em>,
                Group: <em>${plugin?.group}</em>
              </td>
            </tr>
          </table>
        </div>

        <div id="ci-links-placeholder">
          <!-- Placeholder for GitHub and Buildkite links -->
        </div>

        <div class="section">
          <h5>Command Line</h5>
          <pre>${command}</pre>
        </div>

        <div class="section">
          <h5>Owners</h5>
          <pre>${owner.join(', ')}</pre>
        </div>

        <div class="section">
            <h5>Error Details</h5>
            <pre>${error?.stack_trace || 'No stack trace available'}</pre>
        </div>

        <div>
          <details>
            <summary>
              <strong>Failures in tracked branches</strong>:
              <span class="badge rounded-pill bg-danger" id="failure-count">0</span>
            </summary>
              <div id="github-issue-section" style="display: none;">
                <a id="github-issue-link" href="" target="_blank"></a>
              </div>
          </details>
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
