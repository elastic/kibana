/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { screen } from '@testing-library/react';
import { renderWithI18n } from '@kbn/test-jest-helpers';
import { ComponentTitle } from './component_title';

describe('ComponentTitle', () => {
  it('should render correctly when sourceComponentType is null', () => {
    renderWithI18n(<ComponentTitle sourceComponentType={null} />);

    const title = screen.getByText('Data');

    expect(title).toBeInTheDocument();
  });

  it('should render correctly when sourceComponentType is defined', () => {
    renderWithI18n(<ComponentTitle sourceComponentType="SomeComponent" />);

    const title = screen.getByText('SomeComponent');

    expect(title).toBeInTheDocument();
  });
});
