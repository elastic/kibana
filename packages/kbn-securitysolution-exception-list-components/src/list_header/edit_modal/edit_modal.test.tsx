/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import React from 'react';
import { fireEvent, render } from '@testing-library/react';
import * as i18n from '../../translations';
import { EditModal } from '.';

const onSave = jest.fn();
const onCancel = jest.fn();

describe('EditModal', () => {
  beforeEach(() => jest.clearAllMocks());
  it('should render the title and description from listDetails', () => {
    const wrapper = render(
      <EditModal
        listDetails={{ name: 'list name', description: 'list description' }}
        onSave={onSave}
        onCancel={onCancel}
      />
    );
    expect(wrapper).toMatchSnapshot();
    expect(wrapper.getByTestId('editModalTitle')).toHaveTextContent('list name');
  });
  it('should call onSave when submitting the form', () => {
    const wrapper = render(
      <EditModal
        listDetails={{ name: 'list name', description: 'list description' }}
        onSave={onSave}
        onCancel={onCancel}
      />
    );
    fireEvent.submit(wrapper.getByTestId('editModalForm'));
    expect(wrapper.getByTestId('editModalProgess')).toBeInTheDocument();
    expect(onSave).toBeCalled();
  });

  it('should call onCancel', () => {
    const wrapper = render(
      <EditModal
        listDetails={{ name: 'list name', description: 'list description' }}
        onSave={onSave}
        onCancel={onCancel}
      />
    );
    fireEvent.click(wrapper.getByTestId('editModalCancelBtn'));
    expect(onCancel).toBeCalled();
  });

  it('should call change title, description and call onSave with the new props', () => {
    const wrapper = render(
      <EditModal
        listDetails={{ name: 'list name', description: 'list description' }}
        onSave={onSave}
        onCancel={onCancel}
      />
    );
    fireEvent.change(wrapper.getByTestId('editModalNameTextField'), {
      target: { value: 'New list name' },
    });
    fireEvent.change(wrapper.getByTestId('editModalDescriptionTextField'), {
      target: { value: 'New description name' },
    });
    fireEvent.submit(wrapper.getByTestId('editModalForm'));

    expect(onSave).toBeCalledWith({
      name: 'New list name',
      description: 'New description name',
    });
  });

  it('should not call onSave when submitting the form with invalid values', () => {
    const wrapper = render(
      <EditModal
        listDetails={{ name: 'list name', description: 'list description' }}
        onSave={onSave}
        onCancel={onCancel}
      />
    );
    const nameField = wrapper.getByTestId('editModalNameTextField');
    fireEvent.change(nameField, {
      target: { value: '' },
    });
    fireEvent.blur(nameField);
    expect(nameField).toBeInvalid();
    expect(wrapper.queryByTestId('editModalProgess')).not.toBeInTheDocument();
    fireEvent.submit(wrapper.getByTestId('editModalForm'));
    expect(onSave).not.toBeCalled();
    expect(wrapper.getByText(i18n.LIST_NAME_REQUIRED_ERROR)).toBeTruthy();
  });
  it('should call onCanel when clicking on close button', () => {
    const wrapper = render(
      <EditModal
        listDetails={{ name: 'list name', description: 'list description' }}
        onSave={onSave}
        onCancel={onCancel}
      />
    );
    const closeButton = wrapper.getByLabelText('Closes this modal window');
    fireEvent.click(closeButton);
    expect(onCancel).toBeCalled();
  });
});
