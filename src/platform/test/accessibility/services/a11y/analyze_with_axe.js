/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { readFileSync } from 'fs';

export function analyzeWithAxe(context, config, options, callback) {
  Promise.resolve()
    .then(() => {
      if (window.axe) {
        window.axe.configure(config);
        return window.axe.run(context, options);
      }

      // return a false report to trigger analyzeWithAxeWithClient
      return false;
    })
    .then(
      (result) => callback({ result }),
      (error) => {
        callback({
          error: {
            message: error.message,
            stack: error.stack,
          },
        });
      }
    );
}

export const analyzeWithAxeWithClient = `
  ${readFileSync(require.resolve('axe-core/axe.js'), 'utf8')}

  return (${analyzeWithAxe.toString()}).apply(null, arguments);
`;
