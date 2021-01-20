/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { functionWrapper } from '../../expressions/common/expression_functions/specs/tests/utils';
import { createMarkdownVisFn } from './markdown_fn';

describe('interpreter/functions#markdown', () => {
  const fn = functionWrapper(createMarkdownVisFn());
  const args = {
    font: { spec: { fontSize: 12 } },
    openLinksInNewTab: true,
    markdown: '## hello _markdown_',
  };

  it('returns an object with the correct structure', async () => {
    const actual = await fn(null, args, undefined);
    expect(actual).toMatchSnapshot();
  });
});
