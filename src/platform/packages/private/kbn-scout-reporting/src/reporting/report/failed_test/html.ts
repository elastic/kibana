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
    plugin,
    duration,
    error,
    stdout,
    attachments,
  } = testFailure;

  const escapeHtml = (unsafe: string) =>
    unsafe
      ? unsafe
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#039;')
      : '';

  const testDuration = duration < 1000 ? `${duration}ms` : `${(duration / 1000).toFixed(2)}s`;

  const screenshots = attachments
    .filter((a) => a.contentType?.startsWith('image/') && a.path)
    .map((s) => {
      try {
        if (!fs.existsSync(s.path!)) {
          return `<div class="screenshotContainer"><p>Screenshot not available: ${escapeHtml(
            s.name
          )}</p></div>`;
        }

        const base64 = fs.readFileSync(s.path!).toString('base64');
        const mimeType = s.contentType || 'image/png';

        return `
          <div class="screenshotContainer" title="Click to toggle full size">
            <img
              class="screenshot img-fluid img-thumbnail"
              src="data:${mimeType};base64,${base64}"
              alt="${escapeHtml(s.name)}"
              loading="lazy"
            />
          </div>
        `;
      } catch (fileError) {
        return `<div class="screenshotContainer"><p>Error loading screenshot: ${escapeHtml(
          s.name
        )}</p></div>`;
      }
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
  .section {
    margin-bottom: 20px;
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
    height: 200px;
    transition: height 0.3s ease;
  }
  .screenshotContainer.expanded img.screenshot {
    height: auto;
    max-width: 100%;
  }
</style>
<title>Scout Test Failure Report</title>
</head>
<body>
<div class="container my-5">
  <main>
    <h4>Scout Test Failure Report</h4>
    <h5>Location: ${escapeHtml(location)}</h5>
    <hr />

    <div class="section">
      <h5>Test Details</h5>
      <table class="table-details">
        <tr>
          <td><strong>Suite Title</strong></td>
          <td>${escapeHtml(suite)}</td>
        </tr>
        <tr>
          <td><strong>Test Title</strong></td>
          <td>${escapeHtml(title)}</td>
        </tr>
        <tr>
          <td><strong>Execution Details</strong></td>
          <td>Target: <em>${escapeHtml(target)}</em>, Duration: <em>${testDuration}</em></td>
        </tr>
        <tr>
          <td><strong>Plugin</strong></td>
          <td>
            ID: <em>${escapeHtml(plugin?.id ?? '')}</em>,
            Visibility: <em>${escapeHtml(plugin?.visibility ?? '')}</em>,
            Group: <em>${escapeHtml(plugin?.group ?? '')}</em>
          </td>
        </tr>
      </table>
    </div>

    <div id="ci-links-placeholder">
      <!-- Placeholder for GitHub and Buildkite links -->
    </div>

    <div class="section">
      <h5>Command Line</h5>
      <pre>${escapeHtml(command)}</pre>
    </div>

    <div class="section">
      <h5>Owners</h5>
      <pre>${
        Array.isArray(owner) ? owner.map(escapeHtml).join(', ') : escapeHtml(String(owner))
      }</pre>
    </div>

    <div class="section">
      <h5>Error Details</h5>
      <pre>${escapeHtml(error?.stack_trace ?? 'No stack trace available')}</pre>
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
        <pre>${escapeHtml(stdout ?? 'No output available')}</pre>
      </details>
    </div>

    <div class="section">
      <h5>Attachments</h5>
      ${screenshots.length > 0 ? screenshots.join('\n') : '<p>No image attachments available</p>'}
    </div>
  </main>
</div>
<script>
  document.addEventListener('click', (event) => {
    let el = event.target;
    while (el && !el.classList?.contains('screenshot') && !el.classList?.contains('screenshotContainer')) {
      if (el === document.body) return;
      el = el.parentElement;
    }
    if (el && el.classList.contains('screenshot')) {
      const container = el.closest('.screenshotContainer');
      if (container) {
        container.classList.toggle('expanded');
      }
    } else if (el && el.classList.contains('screenshotContainer')) {
      el.classList.toggle('expanded');
    }
  });
</script>
</body>
</html>
  `;
};
