/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { FieldDescription } from './field_description';
import { render, screen } from '@testing-library/react';

describe('FieldDescription', () => {
  it('should render correctly when no custom description', async () => {
    render(<FieldDescription field={{ name: 'bytes' }} />);
    const desc = screen.queryByTestId('fieldDescription-bytes');
    expect(desc).toBeNull();
  });

  it('should render correctly with a short custom description', async () => {
    const customDescription = 'test this desc';
    render(<FieldDescription field={{ name: 'bytes', customDescription }} />);
    const desc = screen.queryByTestId('fieldDescription-bytes');
    expect(desc).toHaveTextContent(customDescription);
    const button = screen.queryByTestId('toggleFieldDescription-bytes');
    expect(button).toBeNull();
  });

  it('should render correctly with a long custom description', async () => {
    const customDescription = 'test this long desc '.repeat(8).trim();
    render(<FieldDescription field={{ name: 'bytes', customDescription }} />);
    expect(screen.queryByTestId('fieldDescription-bytes')).toHaveTextContent(customDescription);
    screen.queryByTestId('toggleFieldDescription-bytes')?.click();
    expect(screen.queryByTestId('fieldDescription-bytes')).toHaveTextContent(
      `${customDescription}View less`
    );
    screen.queryByTestId('toggleFieldDescription-bytes')?.click();
    expect(screen.queryByTestId('fieldDescription-bytes')).toHaveTextContent(customDescription);
  });

  it('should render a long custom description without truncation', async () => {
    const customDescription = 'test this long desc '.repeat(8).trim();
    render(<FieldDescription field={{ name: 'bytes', customDescription }} truncate={false} />);
    expect(screen.queryByTestId('fieldDescription-bytes')).toHaveTextContent(customDescription);
    const button = screen.queryByTestId('toggleFieldDescription-bytes');
    expect(button).toBeNull();
  });
});
