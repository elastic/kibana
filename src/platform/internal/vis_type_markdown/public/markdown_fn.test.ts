/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { functionWrapper } from '@kbn/expressions-plugin/common/expression_functions/specs/tests/utils';
import { createMarkdownVisFn } from './markdown_fn';
import { Arguments } from './types';

describe('interpreter/functions#markdown', () => {
  const fn = functionWrapper(createMarkdownVisFn());
  const args = {
    font: { spec: { fontSize: 12 } },
    openLinksInNewTab: true,
    markdown: '## hello _markdown_',
  } as unknown as Arguments;

  it('returns an object with the correct structure', async () => {
    const actual = await fn(null, args, undefined);
    expect(actual).toMatchSnapshot();
  });
});
