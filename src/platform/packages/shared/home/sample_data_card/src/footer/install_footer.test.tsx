/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { renderWithIntl, mountWithIntl } from '@kbn/test-jest-helpers';
import { act } from 'react-dom/test-utils';

import { InstallFooter, Props } from './install_footer';
import { SampleDataCardProvider, Services } from '../services';
import { getMockServices } from '../mocks';

describe('install footer', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  const id = 'data-set-id';
  const onInstall = jest.fn();
  const notifyError = jest.fn();
  const notifySuccess = jest.fn();

  const props: Props = {
    id,
    onInstall,
    name: 'Data Set Name',
    defaultIndex: 'default-index',
  };

  const render = (element: React.ReactElement) =>
    renderWithIntl(
      <SampleDataCardProvider {...getMockServices()}>{element}</SampleDataCardProvider>
    );

  const mount = (element: React.ReactElement, params?: Partial<Services>) =>
    mountWithIntl(
      <SampleDataCardProvider {...getMockServices({ notifyError, notifySuccess, ...params })}>
        {element}
      </SampleDataCardProvider>
    );

  test('should render', () => {
    const component = render(<InstallFooter {...props} />);
    expect(component).toMatchSnapshot();
  });

  test('should invoke onInstall when install button is clicked', async () => {
    const component = mount(<InstallFooter {...props} />);

    await act(async () => {
      component.find(`button[data-test-subj="addSampleDataSet${id}"]`).simulate('click');
    });

    expect(onInstall).toHaveBeenCalledTimes(1);
    expect(notifySuccess).toHaveBeenCalledTimes(1);
    expect(notifyError).toHaveBeenCalledTimes(0);
  });

  test('should not invoke onInstall when install button is clicked and an error is thrown', async () => {
    const component = mount(<InstallFooter {...props} />, {
      installSampleDataSet: () => {
        throw new Error('error');
      },
    });

    await act(async () => {
      component.find(`button[data-test-subj="addSampleDataSet${id}"]`).simulate('click');
    });

    expect(onInstall).toHaveBeenCalledTimes(0);
    expect(notifySuccess).toHaveBeenCalledTimes(0);
    expect(notifyError).toHaveBeenCalledTimes(1);
  });
});
