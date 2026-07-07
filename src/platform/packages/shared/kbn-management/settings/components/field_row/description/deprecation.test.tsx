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
import { FieldDeprecation } from './deprecation';
import { wrap } from '../mocks';

describe('FieldDeprecation', () => {
  const defaultProps = {
    field: {
      id: 'test:field',
      name: 'test',
      type: 'string',
      deprecation: undefined,
    },
  };

  it('renders without errors', () => {
    const { container } = render(
      wrap(
        <FieldDeprecation
          {...defaultProps}
          field={{
            ...defaultProps.field,
            deprecation: { message: 'Test message', docLinksKey: 'deprecationKey' },
          }}
        />
      )
    );
    expect(container).toBeInTheDocument();
  });

  it('renders nothing if there is no deprecation', () => {
    const { container } = render(wrap(<FieldDeprecation {...defaultProps} />));
    expect(container.firstChild).toBeNull();
  });

  it('renders a warning badge if there is a deprecation', () => {
    const { getByText } = render(
      wrap(
        <FieldDeprecation
          {...defaultProps}
          field={{
            ...defaultProps.field,
            deprecation: { message: 'Test message', docLinksKey: 'deprecationKey' },
          }}
        />
      )
    );
    const badge = getByText('Deprecated');
    expect(badge).toBeInTheDocument();
  });
});
