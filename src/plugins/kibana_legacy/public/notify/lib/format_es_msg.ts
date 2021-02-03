/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import _ from 'lodash';

const getRootCause = (err: Record<string, any> | string) => _.get(err, 'resp.error.root_cause');

/**
 * Utilize the extended error information returned from elasticsearch
 * @param  {Error|String} err
 * @returns {string}
 */
export const formatESMsg = (err: Record<string, any> | string) => {
  const rootCause = getRootCause(err);

  if (!Array.isArray(rootCause)) {
    return;
  }

  return rootCause.map((cause: Record<string, any>) => cause.reason).join('\n');
};
