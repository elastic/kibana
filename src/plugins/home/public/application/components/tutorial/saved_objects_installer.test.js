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
import { findTestSubject } from '@elastic/eui/lib/test';
import { shallowWithIntl, mountWithIntl } from 'test_utils/enzyme_helpers';

import { SavedObjectsInstaller } from './saved_objects_installer';

test('renders', () => {
  const component = shallowWithIntl(
    <SavedObjectsInstaller.WrappedComponent bulkCreate={() => {}} savedObjects={[]} />
  );
  expect(component).toMatchSnapshot();
});

describe('bulkCreate', () => {
  const savedObject = {
    id: '1',
    type: 'index-pattern',
    attributes: {},
  };
  test('should display success message when bulkCreate is successful', async () => {
    const bulkCreateMock = () => {
      return Promise.resolve({
        savedObjects: [savedObject],
      });
    };
    const component = mountWithIntl(
      <SavedObjectsInstaller.WrappedComponent
        bulkCreate={bulkCreateMock}
        savedObjects={[savedObject]}
      />
    );

    findTestSubject(component, 'loadSavedObjects').simulate('click');

    // Ensure all promises resolve
    await new Promise((resolve) => process.nextTick(resolve));
    // Ensure the state changes are reflected
    component.update();

    expect(component).toMatchSnapshot();
  });

  test('should display error message when bulkCreate request fails', async () => {
    const bulkCreateMock = () => {
      return Promise.reject(new Error('simulated bulkRequest error'));
    };
    const component = mountWithIntl(
      <SavedObjectsInstaller.WrappedComponent
        bulkCreate={bulkCreateMock}
        savedObjects={[savedObject]}
      />
    );

    findTestSubject(component, 'loadSavedObjects').simulate('click');

    // Ensure all promises resolve
    await new Promise((resolve) => process.nextTick(resolve));
    // Ensure the state changes are reflected
    component.update();

    expect(component).toMatchSnapshot();
  });

  test('should filter out saved object version before calling bulkCreate', async () => {
    const bulkCreateMock = jest.fn().mockResolvedValue({
      savedObjects: [savedObject],
    });
    const component = mountWithIntl(
      <SavedObjectsInstaller.WrappedComponent
        bulkCreate={bulkCreateMock}
        savedObjects={[{ ...savedObject, version: 'foo' }]}
      />
    );

    findTestSubject(component, 'loadSavedObjects').simulate('click');

    // Ensure all promises resolve
    await new Promise((resolve) => process.nextTick(resolve));
    // Ensure the state changes are reflected
    component.update();

    expect(bulkCreateMock).toHaveBeenCalledWith([savedObject], expect.any(Object));
  });
});
