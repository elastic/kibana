/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Opens the Workflows app in a browser so `workflowsExtensions.isReady()` runs and
 * pushes step/trigger doc metadata to the server (required before
 * `node scripts/generate workflow-step-docs` / `workflow-trigger-docs`).
 */

var playwright = require('playwright');
var chromium = playwright.chromium;

var DEFAULT_KIBANA_URL = 'http://localhost:5601';
var STEP_DEFINITIONS_PATH = '/internal/workflows_extensions/step_definitions';
var POLL_INTERVAL_MS = 2000;
var MAX_POLL_ATTEMPTS = 90;

function getAuthHeader(username, password) {
  return 'Basic ' + Buffer.from(username + ':' + password, 'utf8').toString('base64');
}

function delay(ms) {
  return new Promise(function (resolve) {
    setTimeout(resolve, ms);
  });
}

function stepDocMetadataLooksReady(baseUrl, authHeader) {
  var url = baseUrl.replace(/\/$/, '') + STEP_DEFINITIONS_PATH;
  return fetch(url, {
    headers: {
      Authorization: authHeader,
      'kbn-xsrf': 'true',
      'x-elastic-internal-origin': 'Kibana',
    },
  }).then(function (response) {
    if (!response.ok) {
      return false;
    }
    return response.json().then(function (body) {
      var steps = body.steps;
      if (!Array.isArray(steps) || steps.length === 0) {
        return false;
      }
      return steps.every(function (s) {
        return typeof s.label === 'string' && s.label.length > 0;
      });
    });
  });
}

function pollUntilMetadataReady(normalizedBase, authHeader, attempt) {
  if (attempt > MAX_POLL_ATTEMPTS) {
    return Promise.reject(
      new Error(
        'Timed out waiting for step doc metadata after opening the Workflows app (' +
          MAX_POLL_ATTEMPTS +
          ' attempts). Check Enterprise trial license, workflows:ui:enabled, and that /app/workflows loads.'
      )
    );
  }
  return stepDocMetadataLooksReady(normalizedBase, authHeader)
    .catch(function () {
      return false;
    })
    .then(function (ready) {
      if (ready) {
        return true;
      }
      return delay(POLL_INTERVAL_MS).then(function () {
        return pollUntilMetadataReady(normalizedBase, authHeader, attempt + 1);
      });
    });
}

function warmWorkflowsApp(baseUrl, username, password) {
  var normalizedBase = baseUrl.replace(/\/$/, '');
  var authHeader = getAuthHeader(username, password);
  var browser;

  return chromium
    .launch({ headless: true })
    .then(function (b) {
      browser = b;
      return b.newPage();
    })
    .then(function (page) {
      return page
        .goto(normalizedBase + '/login', { waitUntil: 'domcontentloaded', timeout: 120000 })
        .then(function () {
          var basicCard = page.getByTestId('loginCard-basic/basic');
          return basicCard
            .isVisible()
            .catch(function () {
              return false;
            })
            .then(function (visible) {
              if (visible) {
                return basicCard.click();
              }
              return undefined;
            });
        })
        .then(function () {
          var usernameField = page.getByTestId('loginUsername');
          return usernameField
            .isVisible()
            .catch(function () {
              return false;
            })
            .then(function (visible) {
              if (!visible) {
                return undefined;
              }
              return usernameField
                .fill(username)
                .then(function () {
                  return page.getByTestId('loginPassword').fill(password);
                })
                .then(function () {
                  return page.getByTestId('loginSubmit').click();
                });
            });
        })
        .then(function () {
          return page.getByTestId('kibanaChrome').waitFor({ state: 'visible', timeout: 120000 });
        })
        .then(function () {
          return page.goto(normalizedBase + '/app/workflows', {
            waitUntil: 'domcontentloaded',
            timeout: 180000,
          });
        })
        .then(function () {
          return page.getByTestId('kibanaChrome').waitFor({ state: 'visible', timeout: 180000 });
        })
        .then(function () {
          return pollUntilMetadataReady(normalizedBase, authHeader, 1);
        })
        .then(function () {
          console.log('Workflow extension step doc metadata is ready.');
        });
    })
    .then(
      function () {
        return browser.close();
      },
      function (err) {
        if (!browser) {
          throw err;
        }
        return browser.close().then(function () {
          throw err;
        });
      }
    );
}

function main() {
  var baseUrl = process.env.KIBANA_URL || DEFAULT_KIBANA_URL;
  var username = process.env.KIBANA_USERNAME || 'elastic';
  var password = process.env.KIBANA_PASSWORD || 'changeme';
  return warmWorkflowsApp(baseUrl, username, password);
}

main().catch(function (err) {
  console.error(err);
  process.exit(1);
});
