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

import { RemoveFooter, Props } from './remove_footer';
import { SampleDataCardProvider, Services } from '../services';
import { getMockServices } from '../mocks';

describe('install footer', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  const id = 'data-set-id';
  const onRemove = jest.fn();
  const notifyError = jest.fn();
  const notifySuccess = jest.fn();

  const props: Props = {
    id,
    onRemove,
    name: 'Data Set Name',
    defaultIndex: 'default-index',
    overviewDashboard: 'path/to/overview',
    appLinks: [],
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
    const component = render(<RemoveFooter {...props} />);
    expect(component).toMatchSnapshot();
  });

  test('should invoke onRemove when remove button is clicked', async () => {
    const component = mount(<RemoveFooter {...props} />);

    await act(async () => {
      component.find(`button[data-test-subj="removeSampleDataSet${id}"]`).simulate('click');
    });

    expect(onRemove).toHaveBeenCalledTimes(1);
    expect(notifySuccess).toHaveBeenCalledTimes(1);
    expect(notifyError).toHaveBeenCalledTimes(0);
  });

  test('should not invoke onRemove when remove button is clicked and an error is thrown', async () => {
    const component = mount(<RemoveFooter {...props} />, {
      removeSampleDataSet: () => {
        throw new Error('error');
      },
    });

    await act(async () => {
      component.find(`button[data-test-subj="removeSampleDataSet${id}"]`).simulate('click');
    });

    expect(onRemove).toHaveBeenCalledTimes(0);
    expect(notifySuccess).toHaveBeenCalledTimes(0);
    expect(notifyError).toHaveBeenCalledTimes(1);
  });
});
