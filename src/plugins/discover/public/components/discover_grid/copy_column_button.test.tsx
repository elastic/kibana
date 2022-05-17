/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { buildCopyColumnNameButton, buildCopyColumnValuesButton } from './copy_column_button';
import { EuiButton } from '@elastic/eui';
import { mountWithIntl } from '@kbn/test-jest-helpers';
import { discoverServiceMock } from '../../__mocks__/services';
import { discoverGridContextMock } from './__mocks__/grid_context';

const execCommandMock = (global.document.execCommand = jest.fn());
const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});

describe('Copy to clipboard button', () => {
  it('should copy a column name to clipboard on click', () => {
    const { label, iconType, onClick } = buildCopyColumnNameButton({
      columnId: 'test-field-name',
      services: discoverServiceMock,
    });
    execCommandMock.mockImplementationOnce(() => true);

    const wrapper = mountWithIntl(
      <EuiButton iconType={iconType} onClick={onClick}>
        {label}
      </EuiButton>
    );

    wrapper.find(EuiButton).simulate('click');

    expect(execCommandMock).toHaveBeenCalledWith('copy');
    expect(warn).not.toHaveBeenCalled();
  });

  it('should copy column values to clipboard on click', async () => {
    const originalClipboard = global.window.navigator.clipboard;
    global.window.navigator.clipboard = {
      ...(originalClipboard || { writeText: jest.fn() }),
    };

    const { label, iconType, onClick } = buildCopyColumnValuesButton({
      columnId: 'extension',
      services: discoverServiceMock,
      getCellTextToCopy: discoverGridContextMock.getCellTextToCopy,
      rowsNumber: 3,
    });

    const wrapper = mountWithIntl(
      <EuiButton iconType={iconType} onClick={onClick}>
        {label}
      </EuiButton>
    );

    await wrapper.find(EuiButton).simulate('click');

    // first row out of 3 rows does not have a value
    expect(window.navigator.clipboard.writeText).toHaveBeenCalledWith('\njpg\ngif');

    window.navigator.clipboard = originalClipboard;
  });

  it('should not copy to clipboard on click', () => {
    const { label, iconType, onClick } = buildCopyColumnNameButton({
      columnId: 'test-field-name',
      services: discoverServiceMock,
    });
    execCommandMock.mockImplementationOnce(() => false);

    const wrapper = mountWithIntl(
      <EuiButton iconType={iconType} onClick={onClick}>
        {label}
      </EuiButton>
    );

    wrapper.find(EuiButton).simulate('click');

    expect(execCommandMock).toHaveBeenCalledWith('copy');
    expect(warn).toHaveBeenCalledWith('Unable to copy to clipboard.');
  });
});
