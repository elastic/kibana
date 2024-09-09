/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import url from 'url';

interface AbsoluteURLFactoryOptions {
  basePath: string;
  protocol: string;
  hostname: string;
  port: string | number;
}

export const getAbsoluteUrlFactory = ({
  protocol,
  hostname,
  port,
  basePath,
}: AbsoluteURLFactoryOptions) => {
  return function getAbsoluteUrl({ hash = '', path = '/app/kibana', search = '' } = {}) {
    return url.format({
      protocol,
      hostname,
      port,
      pathname: basePath + path,
      hash,
      search,
    });
  };
};
