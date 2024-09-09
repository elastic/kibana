/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { fireEvent, render } from '@testing-library/react';
import React from 'react';
import { TextWithEdit } from '.';

describe('TextWithEdit', () => {
  it('should not render the edit icon when isReadonly is true', () => {
    const wrapper = render(
      <TextWithEdit isReadonly={true} dataTestSubj="TextWithEditTest" text="Test" />
    );
    expect(wrapper).toMatchSnapshot();
    expect(wrapper.getByTestId('TextWithEditTestText')).toHaveTextContent('Test');
    expect(wrapper.queryByTestId('TextWithEditTestEditIcon')).not.toBeInTheDocument();
  });
  it('should render the edit icon  when isReadonly is false', () => {
    const wrapper = render(
      <TextWithEdit isReadonly={false} dataTestSubj="TextWithEditTest" text="Test" />
    );
    expect(wrapper).toMatchSnapshot();
    expect(wrapper.getByTestId('TextWithEditTestText')).toHaveTextContent('Test');
    expect(wrapper.getByTestId('TextWithEditTestEditIcon')).toBeInTheDocument();
  });
  it('should not call onEdit', () => {
    const onEdit = '';
    const wrapper = render(
      <TextWithEdit
        isReadonly={false}
        dataTestSubj="TextWithEditTest"
        text="Test"
        onEdit={onEdit as any}
      />
    );
    const editIcon = wrapper.getByTestId('TextWithEditTestEditIcon');
    expect(wrapper.getByTestId('TextWithEditTestText')).toHaveTextContent('Test');
    expect(editIcon).toBeInTheDocument();
    fireEvent.click(editIcon);
  });
  it('should call onEdit', () => {
    const onEdit = jest.fn();

    const wrapper = render(
      <TextWithEdit
        isReadonly={false}
        dataTestSubj="TextWithEditTest"
        text="Test"
        onEdit={onEdit}
      />
    );
    expect(wrapper.getByTestId('TextWithEditTestText')).toHaveTextContent('Test');
    expect(wrapper.queryByTestId('TextWithEditTestEditIcon')).toBeInTheDocument();
    fireEvent.click(wrapper.getByTestId('TextWithEditTestEditIcon'));
    expect(onEdit).toBeCalled();
  });
});
