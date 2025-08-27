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
import { EuiDocsLink } from './eui_docs_link';
import type { EuiData } from '../../../../lib/fiber/types';

describe('EuiDocsLink', () => {
  it('should render', () => {
    const mockEuiData: EuiData = {
      componentType: 'EuiButton',
      docsLink: 'https://eui.elastic.co/docs/components/button',
      iconType: 'copy',
    };

    renderWithI18n(<EuiDocsLink euiData={mockEuiData} />);

    const link = screen.getByTestId('euiDocsLink');
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', 'https://eui.elastic.co/docs/components/button');
  });
});
