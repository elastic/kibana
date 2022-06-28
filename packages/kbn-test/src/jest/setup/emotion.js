/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { createSerializer } from '@emotion/jest';

module.exports = createSerializer({
  classNameReplacer: (className) => className,
  includeStyles: false,
});

const consoleError = console.error;
console.error = (message, ...rest) => {
  // @see https://github.com/emotion-js/emotion/issues/1105
  // This error that Emotion throws doesn't apply to Jest, so
  // we're just going to remove the first/nth-child warning
  if (
    typeof message === 'string' &&
    message.includes('The pseudo class') &&
    message.includes('is potentially unsafe when doing server-side rendering. Try changing it to')
  ) {
    return;
  }
  consoleError(message, ...rest);
};
