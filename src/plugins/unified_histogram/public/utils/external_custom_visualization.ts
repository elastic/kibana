/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { ExternalVisContext } from '../types';

export const toExternalVisContextJSONString = (
  visContext: ExternalVisContext | undefined
): string | undefined => {
  if (!visContext || !visContext.requestData || !visContext.attributes) {
    return undefined;
  }

  return JSON.stringify(visContext);
};

export const fromExternalVisContextJSONString = (
  visContextJSON: string | undefined
): ExternalVisContext | undefined => {
  console.log('parsing JSON for', visContextJSON);
  if (!visContextJSON) {
    return undefined;
  }

  let visContext: ExternalVisContext | undefined;

  try {
    visContext = JSON.parse(visContextJSON);

    if (!visContext?.requestData || !visContext.attributes) {
      visContext = undefined;
      throw new Error('visContextJSON is invalid');
    }
  } catch {
    // nothing
  }

  console.log('parsed custom vis context', visContext);

  return visContext;
};
