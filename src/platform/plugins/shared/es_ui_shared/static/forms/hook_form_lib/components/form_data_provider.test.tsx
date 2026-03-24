/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import type { OnUpdateHandler } from '../types';
import { useForm } from '../hooks/use_form';
import { Form } from './form';
import { UseField } from './use_field';
import { FormDataProvider } from './form_data_provider';

const user = userEvent.setup();
const onFormData = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
});

describe('<FormDataProvider />', () => {
  test('should listen to changes in the form data and re-render the children with the updated data', async () => {
    const TestComp = () => {
      const { form } = useForm();

      return (
        <Form form={form}>
          <UseField path="name" defaultValue="Initial value" data-test-subj="nameField" />
          <FormDataProvider>
            {(formData) => {
              onFormData(formData);
              return null;
            }}
          </FormDataProvider>
          {/* Putting one field below to make sure the order in the DOM does not affect behaviour */}
          <UseField path="lastName" defaultValue="Initial value" data-test-subj="lastNameField" />
        </Form>
      );
    };

    render(<TestComp />);

    expect(onFormData).toBeCalledTimes(1);

    expect(onFormData).toHaveBeenCalledWith({
      name: 'Initial value',
      lastName: 'Initial value',
    });

    onFormData.mockClear();

    // Make some changes to the form fields
    const nameField = screen.getByTestId('nameField');
    const lastNameField = screen.getByTestId('lastNameField');

    await user.clear(nameField);
    await user.type(nameField, 'updated name');
    await user.clear(lastNameField);
    await user.type(lastNameField, 'updated lastname');

    // userEvent.type() triggers onChange for each character typed
    // The important thing is to verify the final form data is correct
    expect(onFormData).toHaveBeenCalledWith({
      name: 'updated name',
      lastName: 'updated lastname',
    });
  });

  test('should subscribe to the latest updated form data when mounting late', async () => {
    const TestComp = () => {
      const { form } = useForm();
      const [isOn, setIsOn] = useState(false);

      return (
        <Form form={form}>
          <UseField path="name" defaultValue="Initial value" data-test-subj="nameField" />
          <button onClick={() => setIsOn(true)} data-test-subj="btn">
            Toggle On
          </button>
          {isOn && (
            <FormDataProvider>
              {(formData) => {
                onFormData(formData);
                return null;
              }}
            </FormDataProvider>
          )}
        </Form>
      );
    };

    render(<TestComp />);

    expect(onFormData).toBeCalledTimes(0); // Not present in the DOM yet

    // Make some changes to the form fields
    const nameField = screen.getByTestId('nameField');
    await user.clear(nameField);
    await user.type(nameField, 'updated value');

    // Update state to trigger the mounting of the FormDataProvider
    const button = screen.getByTestId('btn');
    await user.click(button);

    expect(onFormData).toHaveBeenCalledTimes(2);

    expect(onFormData).toHaveBeenCalledWith({
      name: 'updated value',
    });
  });

  test('props.pathsToWatch (string): should not re-render the children when the field that changed is not the one provided', async () => {
    const TestComp = () => {
      const { form } = useForm();

      return (
        <Form form={form}>
          <UseField path="name" defaultValue="Initial value" data-test-subj="nameField" />
          <UseField path="lastName" defaultValue="Initial value" data-test-subj="lastNameField" />
          <FormDataProvider pathsToWatch="name">
            {(formData) => {
              onFormData(formData);
              return null;
            }}
          </FormDataProvider>
        </Form>
      );
    };

    render(<TestComp />);

    onFormData.mockClear();

    // Make some changes to a field we are **not** interested in
    const lastNameField = screen.getByTestId('lastNameField');
    await user.clear(lastNameField);
    await user.type(lastNameField, 'updated value');

    expect(onFormData).toHaveBeenCalledTimes(0);
  });

  test('props.pathsToWatch (Array<string>): should not re-render the children when the field that changed is not in the watch list', async () => {
    const TestComp = () => {
      const { form } = useForm();

      return (
        <Form form={form}>
          <UseField path="name" defaultValue="Initial value" data-test-subj="nameField" />
          <UseField path="lastName" defaultValue="Initial value" data-test-subj="lastNameField" />
          <UseField path="company" defaultValue="Initial value" data-test-subj="companyField" />
          <FormDataProvider pathsToWatch={['name', 'lastName']}>
            {(formData) => {
              onFormData(formData);
              return null;
            }}
          </FormDataProvider>
        </Form>
      );
    };

    render(<TestComp />);

    onFormData.mockClear();

    // Make some changes to fields not in the watch list
    const companyField = screen.getByTestId('companyField');
    await user.clear(companyField);
    await user.type(companyField, 'updated value');

    // No re-render
    expect(onFormData).toBeCalledTimes(0);

    // Make some changes to fields in the watch list
    const nameField = screen.getByTestId('nameField');
    await user.clear(nameField);
    await user.type(nameField, 'updated value');

    // userEvent.type() triggers onChange for each character
    expect(onFormData).toHaveBeenCalled();

    onFormData.mockClear();

    const lastNameField = screen.getByTestId('lastNameField');
    await user.clear(lastNameField);
    await user.type(lastNameField, 'updated value');

    // userEvent.type() triggers onChange for each character
    // The form "isValid" change also causes a re-render
    expect(onFormData).toHaveBeenCalled();

    const [formData] = onFormData.mock.calls[
      onFormData.mock.calls.length - 1
    ] as Parameters<OnUpdateHandler>;

    expect(formData).toEqual({
      name: 'updated value',
      lastName: 'updated value',
      company: 'updated value',
    });
  });
});
