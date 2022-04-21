/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { findTestSubject } from '@elastic/eui/lib/test';
import { shallowWithIntl, mountWithIntl } from '@kbn/test-jest-helpers';

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
