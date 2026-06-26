/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import userEvent from '@testing-library/user-event';
import { buildCopyColumnNameButton, buildCopyColumnValuesButton } from './build_copy_column_button';
import { dataTableContextMock } from '../../__mocks__/table_context';
import { EuiButton } from '@elastic/eui';
import { renderWithI18n } from '@kbn/test-jest-helpers';
import { screen } from '@testing-library/react';
import { servicesMock } from '../../__mocks__/services';

const execCommandMock = (global.document.execCommand = jest.fn());
const originalClipboard = global.window.navigator.clipboard;

const mockClipboard = () => {
  const writeText = jest.fn();

  Object.assign(navigator, {
    clipboard: { writeText },
  });

  return writeText;
};

describe('Build a column button to copy to clipboard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
    Object.assign(navigator, {
      clipboard: originalClipboard,
    });
  });

  it('should copy a column name to clipboard on click', async () => {
    const { iconType, label, onClick } = buildCopyColumnNameButton({
      columnDisplayName: 'test-field-name',
      toastNotifications: servicesMock.toastNotifications,
    });
    execCommandMock.mockImplementationOnce(() => true);

    renderWithI18n(
      <EuiButton iconType={iconType} onClick={onClick}>
        {label}
      </EuiButton>
    );

    await userEvent.click(screen.getByRole('button', { name: 'Copy name' }));

    expect(execCommandMock).toHaveBeenCalledWith('copy');
    expect(servicesMock.toastNotifications.addWarning).not.toHaveBeenCalled();
  });

  it('should copy regular column values to clipboard on click', async () => {
    const writeText = mockClipboard();
    const { iconType, label, onClick } = buildCopyColumnValuesButton({
      columnId: 'extension',
      columnDisplayName: 'custom_extension',
      rowsCount: 3,
      toastNotifications: servicesMock.toastNotifications,
      valueToStringConverter: dataTableContextMock.valueToStringConverter,
    });

    renderWithI18n(
      <EuiButton iconType={iconType} onClick={onClick}>
        {label}
      </EuiButton>
    );

    await userEvent.click(screen.getByRole('button', { name: 'Copy column' }));

    // first row out of 3 rows does not have a value
    expect(writeText).toHaveBeenCalledWith('"custom_extension"\n\njpg\ngif');
  });

  it('should copy source column values to clipboard on click', async () => {
    const writeText = mockClipboard();
    const { iconType, label, onClick } = buildCopyColumnValuesButton({
      columnDisplayName: 'Document',
      columnId: '_source',
      rowsCount: 3,
      toastNotifications: servicesMock.toastNotifications,
      valueToStringConverter: dataTableContextMock.valueToStringConverter,
    });

    renderWithI18n(
      <EuiButton iconType={iconType} onClick={onClick}>
        {label}
      </EuiButton>
    );

    await userEvent.click(screen.getByRole('button', { name: 'Copy column' }));

    // first row out of 3 rows does not have a value
    expect(writeText).toHaveBeenCalledWith(
      'Document\n{"bytes":20,"date":"2020-20-01T12:12:12.123","message":"test1","_index":"i","_score":1}\n' +
        '{"date":"2020-20-01T12:12:12.124","extension":"jpg","name":"test2","_index":"i","_score":1}\n' +
        '{"bytes":50,"date":"2020-20-01T12:12:12.124","extension":"gif","name":"test3","_index":"i","_score":1}'
    );
  });

  it('should not copy to clipboard on click', async () => {
    const { label, iconType, onClick } = buildCopyColumnNameButton({
      columnDisplayName: 'test-field-name',
      toastNotifications: servicesMock.toastNotifications,
    });
    execCommandMock.mockImplementationOnce(() => false);
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});

    renderWithI18n(
      <EuiButton iconType={iconType} onClick={onClick}>
        {label}
      </EuiButton>
    );

    await userEvent.click(screen.getByRole('button', { name: 'Copy name' }));

    expect(execCommandMock).toHaveBeenCalledWith('copy');
    expect(warn).toHaveBeenCalledWith('Unable to copy to clipboard.');
    expect(servicesMock.toastNotifications.addWarning).toHaveBeenCalledWith({
      title: 'Unable to copy to clipboard in this browser',
    });
  });
});
