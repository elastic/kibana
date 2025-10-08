/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { screen, fireEvent } from '@testing-library/react';
import { renderWithI18n } from '@kbn/test-jest-helpers';
import { CopyRelativePathButton } from './copy_relative_path_button';
import { copyToClipboard } from '@elastic/eui';

jest.mock('@elastic/eui', () => ({
  ...jest.requireActual('@elastic/eui'),
  copyToClipboard: jest.fn(),
}));

const mockCopyToClipboard = jest.mocked(copyToClipboard);

const propsMock = {
  relativePath: '/src/components/example/component.tsx',
};

describe('CopyRelativePathButton', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render correctly', () => {
    renderWithI18n(<CopyRelativePathButton {...propsMock} />);

    const copyButton = screen.getByTestId('inspectCopyRelativePathButton');

    expect(copyButton).toBeInTheDocument();
  });

  it('should copy relative path to clipboard when clicked', () => {
    renderWithI18n(<CopyRelativePathButton {...propsMock} />);

    const copyButton = screen.getByTestId('inspectCopyRelativePathButton');

    fireEvent.click(copyButton);

    expect(mockCopyToClipboard).toHaveBeenCalledTimes(1);
    expect(mockCopyToClipboard).toHaveBeenCalledWith('/src/components/example/component.tsx');
  });
});
