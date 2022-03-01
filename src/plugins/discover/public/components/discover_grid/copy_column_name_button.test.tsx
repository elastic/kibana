/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { buildCopyColumnNameButton } from './copy_column_name_button';
import { EuiButton } from '@elastic/eui';
import { mountWithIntl } from '@kbn/test-jest-helpers';

const execCommandMock = (global.document.execCommand = jest.fn());
const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});

describe('Copy to clipboard button', () => {
  it('should copy to clipboard on click', () => {
    const { label, iconType, onClick } = buildCopyColumnNameButton('test-field-name');
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

  it('should not copy to clipboard on click', () => {
    const { label, iconType, onClick } = buildCopyColumnNameButton('test-field-name');
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
