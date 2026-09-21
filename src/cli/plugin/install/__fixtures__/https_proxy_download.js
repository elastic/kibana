/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Logger } from '../../../logger';
import { download } from '../download';

const settings = {
  urls: ['https://example.com/plugin.zip'],
  tempArchiveFile: process.argv[2],
  timeout: 0,
};

const logger = new Logger({ silent: true });

download(settings, logger).then(
  () => {
    throw new Error('Expected the HTTPS request to fail after the proxy closed the CONNECT socket');
  },
  () => {
    // The parent test verifies that the local proxy received the CONNECT request.
  }
);
