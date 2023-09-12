/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { FieldOverriddenMessage } from './overridden_message';
import { FieldDefinition } from '@kbn/management-settings-types';

describe('FieldOverriddenMessage', () => {
  const defaultProps = {
    field: {
      name: 'test',
      type: 'string',
      isOverridden: false,
    } as FieldDefinition<'string'>,
  };

  it('renders without errors', () => {
    const { container } = render(
      <FieldOverriddenMessage {...{ ...defaultProps, isOverridden: true }} />
    );
    expect(container).toBeInTheDocument();
  });

  it('renders nothing if the field is not overridden', () => {
    const { container } = render(<FieldOverriddenMessage {...defaultProps} />);
    expect(container.firstChild).toBeNull();
  });
});
