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
import { IconType } from './icon_type';

describe('IconType', () => {
  it('should render link when euiData is provided', () => {
    const mockIconType = 'logoElastic';

    renderWithI18n(<IconType iconType={mockIconType} />);

    expect(screen.getByText('logoElastic')).toBeInTheDocument();
  });

  it('should render "N/A" when iconType is null', () => {
    renderWithI18n(<IconType iconType={null} />);

    expect(screen.getByText('N/A')).toBeInTheDocument();
  });
});
