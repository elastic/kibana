/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { EuiButton } from '@elastic/eui';
import { mountWithIntl } from '@kbn/test-jest-helpers';
import { discoverServiceMock } from '../../__mocks__/services';
import { discoverGridContextMock } from '../../__mocks__/grid_context';
import { buildCopyColumnNameButton, buildCopyColumnValuesButton } from './build_copy_column_button';

const execCommandMock = (global.document.execCommand = jest.fn());
const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});

describe('Build a column button to copy to clipboard', () => {
  it('should copy a column name to clipboard on click', () => {
    const { label, iconType, onClick } = buildCopyColumnNameButton({
      columnDisplayName: 'test-field-name',
      toastNotifications: discoverServiceMock.toastNotifications,
    });
    execCommandMock.mockImplementationOnce(() => true);

    const wrapper = mountWithIntl(
      <EuiButton iconType={iconType} onClick={onClick}>
        {label}
      </EuiButton>
    );

    wrapper.find('button').simulate('click');

    expect(execCommandMock).toHaveBeenCalledWith('copy');
    expect(warn).not.toHaveBeenCalled();
  });

  it('should copy column values to clipboard on click', async () => {
    const originalClipboard = global.window.navigator.clipboard;

    Object.defineProperty(navigator, 'clipboard', {
      value: {
        writeText: jest.fn(),
      },
      writable: true,
    });

    const { label, iconType, onClick } = buildCopyColumnValuesButton({
      columnId: 'extension',
      columnDisplayName: 'custom_extension',
      toastNotifications: discoverServiceMock.toastNotifications,
      rowsCount: 3,
      valueToStringConverter: discoverGridContextMock.valueToStringConverter,
    });

    const wrapper = mountWithIntl(
      <EuiButton iconType={iconType} onClick={onClick}>
        {label}
      </EuiButton>
    );

    await wrapper.find('button').simulate('click');

    // first row out of 3 rows does not have a value
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('"custom_extension"\n\njpg\ngif');

    const {
      label: labelSource,
      iconType: iconTypeSource,
      onClick: onClickSource,
    } = buildCopyColumnValuesButton({
      columnId: '_source',
      columnDisplayName: 'Document',
      toastNotifications: discoverServiceMock.toastNotifications,
      valueToStringConverter: discoverGridContextMock.valueToStringConverter,
      rowsCount: 3,
    });

    const wrapperSource = mountWithIntl(
      <EuiButton iconType={iconTypeSource} onClick={onClickSource}>
        {labelSource}
      </EuiButton>
    );

    await wrapperSource.find('button').simulate('click');

    // first row out of 3 rows does not have a value
    expect(navigator.clipboard.writeText).toHaveBeenNthCalledWith(
      2,
      'Document\n{"bytes":20,"date":"2020-20-01T12:12:12.123","message":"test1","_index":"i","_score":1}\n' +
        '{"date":"2020-20-01T12:12:12.124","extension":"jpg","name":"test2","_index":"i","_score":1}\n' +
        '{"bytes":50,"date":"2020-20-01T12:12:12.124","extension":"gif","name":"test3","_index":"i","_score":1}'
    );

    Object.defineProperty(navigator, 'clipboard', {
      value: originalClipboard,
    });
  });

  it('should not copy to clipboard on click', () => {
    const { label, iconType, onClick } = buildCopyColumnNameButton({
      columnDisplayName: 'test-field-name',
      toastNotifications: discoverServiceMock.toastNotifications,
    });
    execCommandMock.mockImplementationOnce(() => false);

    const wrapper = mountWithIntl(
      <EuiButton iconType={iconType} onClick={onClick}>
        {label}
      </EuiButton>
    );

    wrapper.find('button').simulate('click');

    expect(execCommandMock).toHaveBeenCalledWith('copy');
    expect(warn).toHaveBeenCalledWith('Unable to copy to clipboard.');
  });
});
