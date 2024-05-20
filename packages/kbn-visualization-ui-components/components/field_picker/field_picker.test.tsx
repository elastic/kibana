/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { FieldPicker, FieldPickerProps } from './field_picker';
import { render, screen } from '@testing-library/react';
import faker from 'faker';
import userEvent from '@testing-library/user-event';
import { DataType, FieldOptionValue } from './types';

const generateFieldWithLabelOfLength = (length: number) => ({
  label: faker.random.alpha({ count: length }),
  value: {
    type: 'field' as const,
    field: faker.random.alpha({ count: length }),
    dataType: 'date' as DataType,
    operationType: 'count',
  },
  exists: true,
  compatible: 1,
});

const generateProps = (customField = generateFieldWithLabelOfLength(20)) =>
  ({
    selectedOptions: [
      {
        label: 'Category',
        value: {
          type: 'field' as const,
          field: 'category.keyword',
          dataType: 'keyword' as DataType,
          operationType: 'count',
        },
      },
    ],
    options: [
      {
        label: 'nested options',
        exists: true,
        compatible: 1,
        value: generateFieldWithLabelOfLength(20),
        options: [
          generateFieldWithLabelOfLength(20),
          customField,
          generateFieldWithLabelOfLength(20),
        ],
      },
    ],
    onChoose: jest.fn(),
    fieldIsInvalid: false,
  } as unknown as FieldPickerProps<FieldOptionValue>);

describe('field picker', () => {
  const renderAndOpenFieldPicker = (customField = generateFieldWithLabelOfLength(20)) => {
    const props = generateProps(customField);
    const rtlRender = render(<FieldPicker {...props} />);
    const openCombobox = () => userEvent.click(screen.getByLabelText(/open list of options/i));
    openCombobox();
    return rtlRender;
  };

  it('should render minimum width dropdown list if all labels are short', async () => {
    renderAndOpenFieldPicker();
    const popover = screen.getByRole('dialog');
    expect(popover).toHaveStyle('inline-size: 256px');
  });

  it('should render calculated width dropdown list if the longest label is longer than min width', async () => {
    renderAndOpenFieldPicker(generateFieldWithLabelOfLength(50));
    const popover = screen.getByRole('dialog');
    expect(popover).toHaveStyle('inline-size: 466px');
  });

  it('should render maximum width dropdown list if the longest label is longer than max width', async () => {
    renderAndOpenFieldPicker(generateFieldWithLabelOfLength(80));
    const popover = screen.getByRole('dialog');
    expect(popover).toHaveStyle('inline-size: 550px');
  });
});
