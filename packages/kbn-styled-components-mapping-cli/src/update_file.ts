/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import * as fs from 'node:fs/promises';

const babelFilePrefix = `/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

module.exports = {
  /**
   * Synchronized list of all source files that use styled-components.
   * Please keep this list up-to-date when converting component styles
   * from styled-components to Emotion.
   *
   * Babel's MatchPattern can be a regex or a string which follows standard
   * Node.js path logic as described here:
   * https://babeljs.io/docs/options#matchpattern
   *
   * Used by \`kbn-babel-preset\` and \`kbn-eslint-config\`.
   */
  USES_STYLED_COMPONENTS: [
    /src[\\/\\\\]platform[\\/\\\\]packages[\\/\\\\]private[\\/\\\\]kbn-ui-shared-deps-npm[\\/\\\\]/,
    /src[\\/\\\\]platform[\\/\\\\]packages[\\/\\\\]private[\\/\\\\]kbn-ui-shared-deps-src[\\/\\\\]/,
`;

const babelFileSuffix = `  ],
};
`;

export const updateFile = async (filePath: string, regexStringArray: string[]) => {
  const contents = `${babelFilePrefix}\n    ${regexStringArray.join(
    ',\n    '
  )},\n${babelFileSuffix}`;

  return fs.writeFile(filePath, contents);
};
