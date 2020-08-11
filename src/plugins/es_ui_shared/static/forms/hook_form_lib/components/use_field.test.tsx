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
import React, { useEffect } from 'react';

import { registerTestBed } from '../shared_imports';
import { OnUpdateHandler } from '../types';
import { useForm } from '../hooks/use_form';
import { Form } from './form';
import { UseField } from './use_field';

describe('<UseField />', () => {
  test('should read the default value from the prop and fallback to the config object', () => {
    const onFormData = jest.fn();

    const TestComp = ({ onData }: { onData: OnUpdateHandler }) => {
      const { form } = useForm();
      const { subscribe } = form;

      useEffect(() => subscribe(onData).unsubscribe, [subscribe, onData]);

      return (
        <Form form={form}>
          <UseField path="name" config={{ defaultValue: 'John' }} />
          <UseField
            path="lastName"
            defaultValue="Snow"
            config={{ defaultValue: 'Will be Overridden' }}
          />
        </Form>
      );
    };

    const setup = registerTestBed(TestComp, {
      defaultProps: { onData: onFormData },
      memoryRouter: { wrapComponent: false },
    });

    setup();

    const [{ data }] = onFormData.mock.calls[onFormData.mock.calls.length - 1] as Parameters<
      OnUpdateHandler
    >;

    expect(data.raw).toEqual({
      name: 'John',
      lastName: 'Snow',
    });
  });
});
