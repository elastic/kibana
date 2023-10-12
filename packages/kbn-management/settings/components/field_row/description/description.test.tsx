/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { FieldDescription } from './description';
import { FieldDefinition } from '@kbn/management-settings-types';
import { wrap } from '../mocks';

const description = 'hello world description';

describe('FieldDescription', () => {
  const defaultProps = {
    field: {
      defaultValue: null,
      defaultValueDisplay: 'null',
      id: 'test',
      isDefaultValue: false,
      name: 'test',
      savedValue: 'hello world',
      type: 'string',
    } as FieldDefinition<'string'>,
  };

  it('renders without errors', () => {
    const { getByText } = render(
      wrap(
        <FieldDescription {...{ ...defaultProps, field: { ...defaultProps.field, description } }} />
      )
    );
    expect(getByText(description)).toBeInTheDocument();
  });

  it('renders a React Element', () => {
    const value = 'This is a description.';
    const element = <div>{value}</div>;
    const { getByText } = render(
      wrap(
        <FieldDescription
          {...{ ...defaultProps, field: { ...defaultProps.field, description: element } }}
        />
      )
    );
    expect(getByText(value)).toBeInTheDocument();
  });

  it('renders no description without one', () => {
    const { queryByText } = render(wrap(<FieldDescription {...defaultProps} />));
    expect(queryByText(description)).toBeNull();
  });
});
