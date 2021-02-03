/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

export default function (kbnServer, server) {
  process.on('warning', (warning) => {
    // deprecation warnings do no reflect a current problem for
    // the user and therefor should be filtered out.
    if (warning.name === 'DeprecationWarning') {
      return;
    }

    server.log(['warning', 'process'], warning);
  });
}
