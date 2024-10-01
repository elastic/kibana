/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getAstAndSyntaxErrors as parse } from '..';

describe('RENAME', () => {
  /**
   * Enable this test once RENAME commands are fixed:
   * https://github.com/elastic/kibana/discussions/182393#discussioncomment-10313313
   */
  it.skip('example from documentation', () => {
    const text = `
FROM kibana_sample_data_logs
| RENAME total_visits as \`Unique Visits (Total)\`,
`;
    const { ast } = parse(text);

    // eslint-disable-next-line no-console
    console.log(JSON.stringify(ast, null, 2));
  });
});
