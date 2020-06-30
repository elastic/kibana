/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */
import React from 'react';
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
          <UseField path="lastName" defaultValue="Initial value" data-test-subj="lastNameField" />
          <FormDataProvider>
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

    expect(onFormData.mock.calls.length).toBe(1);

    const [formDataInitial] = onFormData.mock.calls[onFormData.mock.calls.length - 1] as Parameters<
      OnUpdateHandler
    >;

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

    /**
     * The children will be rendered three times:
     * - Twice for each input value that has changed
     * - once because after updating both fields, the **form** isValid state changes (from "undefined" to "true")
     *   causing a new "form" object to be returned and thus a re-render.
     *
     * When the form object will be memoized (in a future PR), te bellow call count should only be 2 as listening
     * to form data changes should not receive updates when the "isValid" state of the form changes.
     */
    expect(onFormData.mock.calls.length).toBe(3);

    const [formDataUpdated] = onFormData.mock.calls[onFormData.mock.calls.length - 1] as Parameters<
      OnUpdateHandler
    >;

    expect(formDataUpdated).toEqual({
      name: 'updated value',
      lastName: 'updated value',
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

    expect(onFormData.mock.calls.length).toBe(0);
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
    expect(onFormData.mock.calls.length).toBe(0);

    // Make some changes to fields in the watch list
    await act(async () => {
      setInputValue('nameField', 'updated value');
    });

    expect(onFormData.mock.calls.length).toBe(1);

    onFormData.mockReset();

    await act(async () => {
      setInputValue('lastNameField', 'updated value');
    });

    expect(onFormData.mock.calls.length).toBe(2); // 2 as the form "isValid" change caused a re-render

    const [formData] = onFormData.mock.calls[onFormData.mock.calls.length - 1] as Parameters<
      OnUpdateHandler
    >;

    expect(formData).toEqual({
      name: 'updated value',
      lastName: 'updated value',
      company: 'updated value',
    });
  });
});
