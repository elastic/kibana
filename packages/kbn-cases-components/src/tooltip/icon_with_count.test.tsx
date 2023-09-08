/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { render } from '@testing-library/react';

import { IconWithCount } from './icon_with_count';

describe('IconWithCount', () => {
  it('renders component correctly', () => {
    const res = render(<IconWithCount count={5} icon={'editorComment'} />);

    expect(res.getByTestId('comment-count-icon')).toBeInTheDocument();
  });

  it('renders count correctly', () => {
    const res = render(<IconWithCount count={100} icon={'editorComment'} />);

    expect(res.getByText(100)).toBeInTheDocument();
  });
});
