/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/* eslint-disable no-console */
import https from 'https';
import { getEuiBaseUrlWithVersion } from '../fixtures/eui_helpers';

function handleUnavailable(euiUrl: string, reason?: string) {
  console.error(`EUI website is not available at ${euiUrl}`);
  if (reason) {
    console.error(`Reason: ${reason}`);
  }
  console.error('Skipping EUI Helpers Tests.');
  return 2;
}

/**
 * Checks if the EUI website for the current version is available.
 * Returns exit code 0 if available, 2 if not available.
 */
async function checkEuiAvailability(): Promise<number> {
  let euiUrl: string;
  try {
    euiUrl = getEuiBaseUrlWithVersion();
  } catch (error) {
    return handleUnavailable('unknown', `Failed to get EUI URL: ${error}`);
  }

  console.log(`Checking EUI website availability: ${euiUrl}`);

  try {
    const isAvailable = await checkUrlAvailability(euiUrl);

    if (isAvailable) {
      console.log(`EUI website is available at ${euiUrl}`);
      return 0;
    }

    return handleUnavailable(euiUrl);
  } catch (error) {
    return handleUnavailable(euiUrl, `Error: ${error}`);
  }
}

/**
 * Checks if a URL is accessible and returns HTML content.
 * Returns true if the response status is 2xx or 3xx and contains HTML content.
 */
function checkUrlAvailability(host: string): Promise<boolean> {
  return new Promise((resolve) => {
    const url = new URL(host);
    const options = {
      hostname: url.hostname,
      port: url.port || 443,
      path: url.pathname + url.search,
      method: 'GET',
    };

    const req = https.request(options, (res) => {
      // Check status code first
      if (res.statusCode === undefined || res.statusCode < 200 || res.statusCode >= 400) {
        resolve(false);
        return;
      }

      // Check content-type header
      const contentType = res.headers['content-type'] || '';
      if (!contentType.includes('text/html')) {
        console.error(`Unexpected content-type: ${contentType}`);
        resolve(false);
        return;
      }

      // Collect response body to verify HTML content
      let body = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => {
        body += chunk;
        // check first 50KB
        if (body.length > 50000) {
          res.destroy();
        }
      });

      res.on('end', () => {
        // Check if response contains HTML content
        const hasHtmlContent =
          body.length > 0 &&
          (body.includes('<html') ||
            body.includes('<HTML') ||
            body.includes('<!DOCTYPE html') ||
            body.includes('<!doctype html'));

        if (!hasHtmlContent) {
          console.error('Response does not contain HTML content');
          resolve(false);
          return;
        }

        resolve(true);
      });

      res.on('error', (error) => {
        console.error(`Response error: ${error.message}`);
        resolve(false);
      });
    });

    req.on('error', (error) => {
      console.error(`Request error: ${error.message}`);
      resolve(false);
    });

    // Set timeout on the request object
    req.setTimeout(10000, () => {
      console.error('Request timeout');
      req.destroy();
      resolve(false);
    });

    req.end();
  });
}

if (require.main === module) {
  checkEuiAvailability()
    .then((exitCode) => {
      process.exit(exitCode);
    })
    .catch((error) => {
      console.error('Unexpected error:', error);
      process.exit(1);
    });
}
