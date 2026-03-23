/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createSerializer, matchers } from '@emotion/jest';
import { replaceEmotionPrefix } from '@elastic/eui/lib/test';

// Add the custom matchers provided by '@emotion/jest'
// eslint-disable-next-line no-undef
expect.extend(matchers);

module.exports = createSerializer({
  classNameReplacer: replaceEmotionPrefix,
  includeStyles: false,
});
// NOTE: The above `createSerializer` needs to be repeated in canvas'
// `storyshots.test.tsx` file as well, as they do not use the kbn-test config

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
  // @see https://github.com/jsdom/jsdom/issues/2177
  // JSDOM doesn't yet know how to parse @container CSS queries -
  // all we can do is silence its errors for now
  if (
    typeof message === 'object' &&
    message?.message?.startsWith('Could not parse CSS stylesheet')
  ) {
    return;
  }
  // @see https://github.com/jsdom/jsdom/issues/3597
  // @see https://github.com/jsdom/jsdom/issues/3858
  // jsdom 20.0.1 (our current version) fails to parse @container queries, causing console errors.
  // Parsing was fixed in jsdom 24.1.0+ (May 2024), but actual container query evaluation
  // is still not implemented (issue #3858 remains open). For tests, this is acceptable since
  // container queries are progressive enhancement and don't affect test functionality.
  // TODO: Remove this suppression after upgrading jsdom to 24.1.0+ (eliminates parse errors)
  if (
    typeof message === 'string' &&
    message.includes('There was a problem inserting the following rule') &&
    message.includes('@container')
  ) {
    return;
  }
  consoleError(message, ...rest);
};
