/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { render, screen } from '@testing-library/react';
import React from 'react';
import { IgnoredReason } from '@kbn/discover-utils';
import { DOC_VIEWER_DEFAULT_TRUNCATE_MAX_HEIGHT, TableFieldValue } from './table_field_value';

// Mock useResizeObserver to control scrollHeight behavior
jest.mock('@elastic/eui', () => {
  const actual = jest.requireActual('@elastic/eui');
  return {
    ...actual,
    useResizeObserver: jest.fn(() => ({ width: 800, height: 600 })),
  };
});

describe('TableFieldValue', () => {
  describe('basic rendering', () => {
    it('renders a string formatted value', () => {
      render(<TableFieldValue field="name" formattedValue="hello world" rawValue="hello world" />);

      expect(screen.getByTestId('tableDocViewRow-name-value')).toBeInTheDocument();
      expect(screen.getByText('hello world')).toBeInTheDocument();
    });

    it('renders a number formatted value', () => {
      render(<TableFieldValue field="count" formattedValue="42" rawValue={42} />);

      expect(screen.getByTestId('tableDocViewRow-count-value')).toBeInTheDocument();
      expect(screen.getByText('42')).toBeInTheDocument();
    });

    it('renders a boolean formatted value', () => {
      render(<TableFieldValue field="active" formattedValue="true" rawValue={true} />);

      expect(screen.getByTestId('tableDocViewRow-active-value')).toBeInTheDocument();
      expect(screen.getByText('true')).toBeInTheDocument();
    });

    it('renders a formatted React element value', () => {
      const element = <span data-test-subj="custom-element">{'custom content'}</span>;
      render(<TableFieldValue field="custom" formattedValue={element} rawValue="raw" />);

      expect(screen.getByTestId('custom-element')).toBeInTheDocument();
      expect(screen.getByText('custom content')).toBeInTheDocument();
    });
  });

  describe('ignore warning', () => {
    it('renders IgnoreWarning when ignoreReason is provided with IGNORE_ABOVE', () => {
      render(
        <TableFieldValue
          field="long_field"
          formattedValue="truncated value"
          rawValue="very long string"
          ignoreReason={IgnoredReason.IGNORE_ABOVE}
        />
      );

      expect(screen.getByText('Ignored value')).toBeInTheDocument();
    });

    it('renders IgnoreWarning for MALFORMED reason', () => {
      render(
        <TableFieldValue
          field="bad_field"
          formattedValue="malformed"
          rawValue="bad data"
          ignoreReason={IgnoredReason.MALFORMED}
        />
      );

      expect(screen.getByText('Ignored value')).toBeInTheDocument();
    });

    it('renders "Contains ignored values" for multi-value IGNORE_ABOVE', () => {
      render(
        <TableFieldValue
          field="multi_field"
          formattedValue="values"
          rawValue={['a', 'b']}
          ignoreReason={IgnoredReason.IGNORE_ABOVE}
        />
      );

      expect(screen.getByText('Contains ignored values')).toBeInTheDocument();
    });

    it('does not render IgnoreWarning when ignoreReason is undefined', () => {
      render(<TableFieldValue field="normal_field" formattedValue="value" rawValue="value" />);

      expect(screen.queryByText('Ignored value')).not.toBeInTheDocument();
      expect(screen.queryByText('Contains ignored values')).not.toBeInTheDocument();
    });
  });

  describe('highlighting', () => {
    it('applies highlighted styles when isHighlighted is true', () => {
      const { container } = render(
        <TableFieldValue
          field="highlighted_field"
          formattedValue="matched value"
          rawValue="matched value"
          isHighlighted={true}
        />
      );

      const valueDiv = container.querySelector('#tableDocViewRow-highlighted_field-value');
      expect(valueDiv).toBeInTheDocument();
    });

    it('does not apply highlighted styles when isHighlighted is false', () => {
      const { container } = render(
        <TableFieldValue
          field="normal_field"
          formattedValue="value"
          rawValue="value"
          isHighlighted={false}
        />
      );

      const valueDiv = container.querySelector('#tableDocViewRow-normal_field-value');
      expect(valueDiv).toBeInTheDocument();
    });
  });

  describe('value element ID', () => {
    it('sets the correct id attribute on the value element', () => {
      const { container } = render(
        <TableFieldValue field="my_field" formattedValue="value" rawValue="value" />
      );

      const valueElement = container.querySelector('#tableDocViewRow-my_field-value');
      expect(valueElement).toBeInTheDocument();
    });

    it('sets the correct data-test-subj attribute', () => {
      render(<TableFieldValue field="test_field" formattedValue="value" rawValue="value" />);

      expect(screen.getByTestId('tableDocViewRow-test_field-value')).toBeInTheDocument();
    });
  });

  describe('truncation constant', () => {
    it('exports the default truncation max height', () => {
      expect(DOC_VIEWER_DEFAULT_TRUNCATE_MAX_HEIGHT).toBe(110);
    });
  });

  describe('field types', () => {
    it('renders object formatted value as string', () => {
      const objValue = { nested: 'data' };
      render(
        <TableFieldValue
          field="obj_field"
          formattedValue={JSON.stringify(objValue)}
          rawValue={objValue}
        />
      );

      expect(screen.getByText('{"nested":"data"}')).toBeInTheDocument();
    });

    it('renders array formatted value', () => {
      const arrValue = [1, 2, 3];
      render(<TableFieldValue field="arr_field" formattedValue="[1, 2, 3]" rawValue={arrValue} />);

      expect(screen.getByText('[1, 2, 3]')).toBeInTheDocument();
    });

    it('renders date formatted value', () => {
      render(
        <TableFieldValue
          field="date_field"
          formattedValue="Jan 15, 2024"
          rawValue="2024-01-15T10:30:00Z"
        />
      );

      expect(screen.getByText('Jan 15, 2024')).toBeInTheDocument();
    });

    it('renders null formatted value as dash', () => {
      render(<TableFieldValue field="null_field" formattedValue="-" rawValue={null} />);

      expect(screen.getByText('-')).toBeInTheDocument();
    });
  });
});
