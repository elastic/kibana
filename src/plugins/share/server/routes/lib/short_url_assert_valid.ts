/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { parse } from 'url';
import { trim } from 'lodash';
import Boom from '@hapi/boom';

export function shortUrlAssertValid(url: string) {
  const { protocol, hostname, pathname } = parse(
    url,
    false /* parseQueryString */,
    true /* slashesDenoteHost */
  );

  if (protocol !== null) {
    throw Boom.notAcceptable(`Short url targets cannot have a protocol, found "${protocol}"`);
  }

  if (hostname !== null) {
    throw Boom.notAcceptable(`Short url targets cannot have a hostname, found "${hostname}"`);
  }

  const pathnameParts = trim(pathname === null ? undefined : pathname, '/').split('/');
  if (pathnameParts.length !== 2 || pathnameParts[0] !== 'app' || !pathnameParts[1]) {
    throw Boom.notAcceptable(
      `Short url target path must be in the format "/app/{{appId}}", found "${pathname}"`
    );
  }
}
