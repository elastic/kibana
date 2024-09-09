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
import { FieldDefaultValue, DATA_TEST_SUBJ_DEFAULT_DISPLAY_PREFIX } from './default_value';
import { wrap } from '../mocks';

describe('FieldDefaultValue', () => {
  it('renders without errors', () => {
    const { container } = render(
      wrap(
        <FieldDefaultValue
          field={{
            id: 'test',
            type: 'string',
            isDefaultValue: false,
            defaultValueDisplay: 'null',
          }}
        />
      )
    );

    expect(container).toBeInTheDocument();
  });

  it('renders nothing if the default value is set', () => {
    const { container } = render(
      wrap(
        <FieldDefaultValue
          field={{
            id: 'test',
            type: 'string',
            isDefaultValue: true,
            defaultValueDisplay: 'null',
          }}
        />
      )
    );

    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing if an unsaved change matches the default value', () => {
    const { container } = render(
      wrap(
        <FieldDefaultValue
          field={{
            id: 'test',
            type: 'string',
            isDefaultValue: false,
            defaultValueDisplay: 'null',
            defaultValue: 'test',
          }}
          unsavedChange={{
            type: 'string',
            unsavedValue: 'test',
          }}
        />
      )
    );

    expect(container).toBeEmptyDOMElement();
  });

  it('does not render a code block for string fields', () => {
    const { queryByTestId, getByText } = render(
      wrap(
        <FieldDefaultValue
          field={{
            id: 'test',
            type: 'string',
            isDefaultValue: false,
            defaultValueDisplay: 'hello world',
          }}
        />
      )
    );
    const input = queryByTestId(`${DATA_TEST_SUBJ_DEFAULT_DISPLAY_PREFIX}-test`);
    expect(input).not.toBeInTheDocument();
    const label = getByText('hello world');
    expect(label).toBeInTheDocument();
  });

  it('renders a code block for JSON fields', () => {
    const { getByTestId } = render(
      wrap(
        <FieldDefaultValue
          field={{
            id: 'test',
            type: 'json',
            isDefaultValue: false,
            defaultValueDisplay: '{ foo: bar }',
          }}
        />
      )
    );
    const input = getByTestId(`${DATA_TEST_SUBJ_DEFAULT_DISPLAY_PREFIX}-test`);
    expect(input).toBeInTheDocument();
  });
});
