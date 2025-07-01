/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { DocumentJsonDisplay } from './document_json_display';
import { getDataTableRecordWithContextMock } from '../../../__mocks__';

const setup = (props: React.ComponentProps<typeof DocumentJsonDisplay>) => {
  render(<DocumentJsonDisplay {...props} />);
};

describe('<DocumentJsonDisplay />', () => {
  it('renders', () => {
    // Given
    const record = getDataTableRecordWithContextMock({ raw: { _index: 'test' } });

    // When
    setup({ record });

    // Then
    expect(screen.getByText('"_index": "test"', { exact: false })).toBeVisible();
  });
});
