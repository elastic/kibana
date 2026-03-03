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
import { DataSection } from './data_section';
import { mockComponentData } from '../../../../__mocks__/mocks';

describe('DataSection', () => {
  it('should render correctly', () => {
    renderWithI18n(<DataSection componentData={mockComponentData} />);

    const title = screen.getByText('CapybaraWrapper');
    expect(title).toBeInTheDocument();
  });
});
