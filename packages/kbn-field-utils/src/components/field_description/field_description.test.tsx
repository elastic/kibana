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
    const description = 'test this desc';
    render(<FieldDescription field={{ name: 'bytes', description }} />);
    const desc = screen.queryByTestId('fieldDescription-bytes');
    expect(desc).toHaveTextContent(description);
    const button = screen.queryByTestId('toggleFieldDescription-bytes');
    expect(button).toBeNull();
  });

  it('should render correctly with a long custom description', async () => {
    const description = 'test this long desc '.repeat(8).trim();
    render(<FieldDescription field={{ name: 'bytes', description }} />);
    expect(screen.queryByTestId('fieldDescription-bytes')).toHaveTextContent(description);
    screen.queryByTestId('toggleFieldDescription-bytes')?.click();
    expect(screen.queryByTestId('fieldDescription-bytes')).toHaveTextContent(
      `${description}View less`
    );
    screen.queryByTestId('toggleFieldDescription-bytes')?.click();
    expect(screen.queryByTestId('fieldDescription-bytes')).toHaveTextContent(description);
  });

  it('should render a long custom description without truncation', async () => {
    const description = 'test this long desc '.repeat(8).trim();
    render(<FieldDescription field={{ name: 'bytes', description }} truncate={false} />);
    expect(screen.queryByTestId('fieldDescription-bytes')).toHaveTextContent(description);
    const button = screen.queryByTestId('toggleFieldDescription-bytes');
    expect(button).toBeNull();
  });
});
