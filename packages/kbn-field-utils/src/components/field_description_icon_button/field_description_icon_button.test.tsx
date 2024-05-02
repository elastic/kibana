/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { FieldDescriptionIconButton } from './field_description_icon_button';
import { render, screen } from '@testing-library/react';

describe('FieldDescriptionIconButton', () => {
  it('should render correctly when no custom description', async () => {
    const { container } = render(<FieldDescriptionIconButton field={{ name: 'bytes' }} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('should render correctly with a short custom description', async () => {
    const customDescription = 'test this desc';
    render(<FieldDescriptionIconButton field={{ name: 'bytes', customDescription }} />);
    expect(screen.queryByTestId('fieldDescription-bytes')).toBeNull();
    screen.queryByTestId('fieldDescriptionPopoverButton-bytes')?.click();
    expect(screen.queryByTestId('fieldDescription-bytes')).toHaveTextContent(customDescription);
  });

  it('should render correctly with a long custom description', async () => {
    const customDescription = 'test this long desc '.repeat(8).trim();
    render(<FieldDescriptionIconButton field={{ name: 'bytes', customDescription }} />);
    expect(screen.queryByTestId('fieldDescription-bytes')).toBeNull();
    screen.queryByTestId('fieldDescriptionPopoverButton-bytes')?.click();
    expect(screen.queryByTestId('fieldDescription-bytes')).toHaveTextContent(customDescription);
  });
});
