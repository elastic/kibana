/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { render } from '@testing-library/react';
import { Content } from './content';

describe('Content component', () => {
  test('should render Content component with markdown', async () => {
    const { getByText } = render(
      <Content
        text={'I am *some* [content](https://en.wikipedia.org/wiki/Content) with `markdown`'}
      />
    );

    // Check if the italicized text is rendered
    expect(getByText('some', { selector: 'em' })).toBeInTheDocument();

    // Check if the link is rendered
    expect(getByText('content', { selector: 'a' })).toBeInTheDocument();
    expect(getByText('content').closest('a')).toHaveAttribute(
      'href',
      'https://en.wikipedia.org/wiki/Content'
    );

    // Check if the inline code is rendered
    expect(getByText('markdown', { selector: 'code' })).toBeInTheDocument();
  });
});
