/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useState } from 'react';
import { act } from 'react-dom/test-utils';

import { registerTestBed, TestBed } from '../shared_imports';
import { OnUpdateHandler } from '../types';
import { useForm } from '../hooks/use_form';
import { Form } from './form';
import { UseField } from './use_field';
import { FormDataProvider } from './form_data_provider';

describe('<FormDataProvider />', () => {
  test('should listen to changes in the form data and re-render the children with the updated data', async () => {
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

    const setup = registerTestBed(TestComp, {
      memoryRouter: { wrapComponent: false },
    });

    const {
      form: { setInputValue },
    } = setup() as TestBed;

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
    await act(async () => {
      setInputValue('nameField', 'updated value');
      setInputValue('lastNameField', 'updated value');
    });

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

    const setup = registerTestBed(TestComp, {
      memoryRouter: { wrapComponent: false },
    });

    const {
      form: { setInputValue },
      find,
    } = setup() as TestBed;

    expect(onFormData).toBeCalledTimes(0); // Not present in the DOM yet

    // Make some changes to the form fields
    await act(async () => {
      setInputValue('nameField', 'updated value');
    });

    // Update state to trigger the mounting of the FormDataProvider
    await act(async () => {
      find('btn').simulate('click').update();
    });

    expect(onFormData.mock.calls.length).toBe(2);

    const [formDataUpdated] = onFormData.mock.calls[
      onFormData.mock.calls.length - 1
    ] as Parameters<OnUpdateHandler>;

    expect(formDataUpdated).toEqual({
      name: 'updated value',
    });
  });

  test('props.pathsToWatch (string): should not re-render the children when the field that changed is not the one provided', async () => {
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

    const setup = registerTestBed(TestComp, {
      memoryRouter: { wrapComponent: false },
    });

    const {
      form: { setInputValue },
    } = setup() as TestBed;

    onFormData.mockReset(); // Reset the calls counter at 0

    // Make some changes to a field we are **not** interested in
    await act(async () => {
      setInputValue('lastNameField', 'updated value');
    });

    expect(onFormData).toBeCalledTimes(0);
  });

  test('props.pathsToWatch (Array<string>): should not re-render the children when the field that changed is not in the watch list', async () => {
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

    const setup = registerTestBed(TestComp, {
      memoryRouter: { wrapComponent: false },
    });

    const {
      form: { setInputValue },
    } = setup() as TestBed;

    onFormData.mockReset(); // Reset the calls counter at 0

    // Make some changes to fields not in the watch list
    await act(async () => {
      setInputValue('companyField', 'updated value');
    });

    // No re-render
    expect(onFormData).toBeCalledTimes(0);

    // Make some changes to fields in the watch list
    await act(async () => {
      setInputValue('nameField', 'updated value');
    });

    expect(onFormData).toBeCalledTimes(1);

    onFormData.mockReset();

    await act(async () => {
      setInputValue('lastNameField', 'updated value');
    });

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
