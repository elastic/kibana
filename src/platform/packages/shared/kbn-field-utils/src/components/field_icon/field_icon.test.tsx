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
import { stubLogstashDataView as dataView } from '@kbn/data-views-plugin/common/data_view.stub';
import FieldIcon from './field_icon';
import { getFieldIconProps } from './get_field_icon_props';

const dateField = dataView.getFieldByName('@timestamp')!;
const scriptedField = dataView.getFieldByName('script date')!;

describe('FieldUtils <FieldIcon />', () => {
  test('renders properly', () => {
    const { container } = render(<FieldIcon {...getFieldIconProps(dateField)} />);
    expect(container).toBeInTheDocument();
    expect(container.firstChild).toBeTruthy();
  });

  test('renders properly scripted fields', () => {
    const { container } = render(<FieldIcon {...getFieldIconProps(scriptedField)} />);
    expect(container).toBeInTheDocument();
    expect(container.firstChild).toBeTruthy();
  });

  test('accepts additional props', () => {
    const { container } = render(<FieldIcon {...getFieldIconProps(dateField)} fill="none" />);
    expect(container).toBeInTheDocument();
    expect(container.firstChild).toBeTruthy();
  });

  test('renders Document type properly', () => {
    const { container } = render(<FieldIcon type="document" />);
    expect(container).toBeInTheDocument();
    expect(container.firstChild).toBeTruthy();
  });
});
