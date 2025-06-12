/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { UrlForwardingSetup } from '@kbn/url-forwarding-plugin/public';

export const forwardLegacyUrls = (urlForwarding: UrlForwardingSetup) => {
  urlForwarding.forwardApp('doc', 'discover', (path) => {
    return `#${path}`;
  });

  urlForwarding.forwardApp('context', 'discover', (path) => {
    const urlParts = path.split('/');
    // take care of urls containing legacy url, those split in the following way
    // ["", "context", indexPatternId, _type, id + params]
    if (urlParts[4]) {
      // remove _type part
      const newPath = [...urlParts.slice(0, 3), ...urlParts.slice(4)].join('/');
      return `#${newPath}`;
    }
    return `#${path}`;
  });

  urlForwarding.forwardApp('discover', 'discover', (path) => {
    const [, id, tail] = /discover\/([^\?]+)(.*)/.exec(path) || [];
    if (!id) {
      return `#${path.replace('/discover', '') || '/'}`;
    }
    return `#/view/${id}${tail || ''}`;
  });
};
