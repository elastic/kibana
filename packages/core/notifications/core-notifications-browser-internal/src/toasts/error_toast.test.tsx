/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { shallow } from 'enzyme';
import React from 'react';
import { mountWithIntl } from '@kbn/test-jest-helpers';

import { ErrorToast } from './error_toast';

interface ErrorToastProps {
  error?: Error;
  title?: string;
  toastMessage?: string;
}

let openModal: jest.Mock;

beforeEach(() => (openModal = jest.fn()));

function render(props: ErrorToastProps = {}) {
  return (
    <ErrorToast
      openModal={openModal}
      error={props.error || new Error('error message')}
      title={props.title || 'An error occured'}
      toastMessage={props.toastMessage || 'This is the toast message'}
      i18nContext={() =>
        ({ children }) =>
          <React.Fragment>{children}</React.Fragment>}
    />
  );
}

it('renders matching snapshot', () => {
  expect(shallow(render())).toMatchSnapshot();
});

it('should open a modal when clicking button', () => {
  const wrapper = mountWithIntl(render());
  expect(openModal).not.toHaveBeenCalled();
  wrapper.find('button').simulate('click');
  expect(openModal).toHaveBeenCalled();
});

afterAll(() => {
  // Cleanup document.body to cleanup any modals which might be left over from tests.
  document.body.innerHTML = '';
});
