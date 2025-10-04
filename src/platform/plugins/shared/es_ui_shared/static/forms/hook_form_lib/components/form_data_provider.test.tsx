/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useState } from 'react';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { renderWithI18n } from '@kbn/test-jest-helpers';
import type { OnUpdateHandler } from '../types';
import type { OnUpdateHandler } from '../types';
import { useForm } from '../hooks/use_form';
import { Form } from './form';
import { UseField } from './use_field';
import { FormDataProvider } from './form_data_provider';

describe('<FormDataProvider />', () => {
  test('should listen to changes in the form data and re-render the children with the updated data', async () => {
    const user = userEvent.setup();
    const onFormData = jest.fn();

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

    renderWithI18n(<TestComp />);

    expect(onFormData.mock.calls.length).toBe(1);

    const [formDataInitial] = onFormData.mock.calls[
      onFormData.mock.calls.length - 1
    ] as Parameters<OnUpdateHandler>;

    expect(formDataInitial).toEqual({
      name: 'Initial value',
      lastName: 'Initial value',
    });

    onFormData.mockReset(); // Reset the counter at 0

    // Make some changes to the form fields
    await user.type(screen.getByTestId('nameField'), '{selectall}updated value');
    await user.type(screen.getByTestId('lastNameField'), '{selectall}updated value');

    expect(onFormData).toBeCalledTimes(2);

    const [formDataUpdated] = onFormData.mock.calls[
      onFormData.mock.calls.length - 1
    ] as Parameters<OnUpdateHandler>;

    expect(formDataUpdated).toEqual({
      name: 'updated value',
      lastName: 'updated value',
    });
  });

  test('should subscribe to the latest updated form data when mounting late', async () => {
    const user = userEvent.setup();
    const onFormData = jest.fn();

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

    renderWithI18n(<TestComp />);

    expect(onFormData).toBeCalledTimes(0); // Not present in the DOM yet

    // Make some changes to the form fields
    await user.type(screen.getByTestId('nameField'), '{selectall}updated value');

    // Update state to trigger the mounting of the FormDataProvider
    await user.click(screen.getByTestId('btn'));

    expect(onFormData.mock.calls.length).toBe(2);

    const [formDataUpdated] = onFormData.mock.calls[
      onFormData.mock.calls.length - 1
    ] as Parameters<OnUpdateHandler>;

    expect(formDataUpdated).toEqual({
      name: 'updated value',
    });
  });

  test('props.pathsToWatch (string): should not re-render the children when the field that changed is not the one provided', async () => {
    const user = userEvent.setup();
    const onFormData = jest.fn();

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

    renderWithI18n(<TestComp />);

    onFormData.mockReset(); // Reset the calls counter at 0

    // Make some changes to a field we are **not** interested in
    await user.type(screen.getByTestId('lastNameField'), '{selectall}updated value');

    expect(onFormData).toBeCalledTimes(0);
  });

  test('props.pathsToWatch (Array<string>): should not re-render the children when the field that changed is not in the watch list', async () => {
    const user = userEvent.setup();
    const onFormData = jest.fn();

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

    renderWithI18n(<TestComp />);

    onFormData.mockReset(); // Reset the calls counter at 0

    // Make some changes to fields not in the watch list
    await user.type(screen.getByTestId('companyField'), '{selectall}updated value');

    // No re-render
    expect(onFormData).toBeCalledTimes(0);

    // Make some changes to fields in the watch list
    await user.type(screen.getByTestId('nameField'), '{selectall}updated value');

    expect(onFormData).toBeCalledTimes(1);

    onFormData.mockReset();

    await user.type(screen.getByTestId('lastNameField'), '{selectall}updated value');

    expect(onFormData.mock.calls.length).toBe(2); // 2 as the form "isValid" change caused a re-render

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
