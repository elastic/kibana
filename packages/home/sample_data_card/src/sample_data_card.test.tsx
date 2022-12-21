/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { renderWithIntl, mountWithIntl } from '@kbn/test-jest-helpers';
import { act } from 'react-dom/test-utils';

import { SampleDataCard } from './sample_data_card';
import { SampleDataCardProvider } from './services';
import { getMockServices, getMockDataSet } from './mocks';
import { Services } from './services';
import { INSTALLED_STATUS, UNINSTALLED_STATUS } from './constants';

describe('SampleDataCard', () => {
  const onStatusChange = jest.fn();
  const sampleDataSet = getMockDataSet();

  beforeAll(() => jest.resetAllMocks());

  const render = (element: React.ReactElement, services: Partial<Services> = {}) =>
    renderWithIntl(
      <SampleDataCardProvider {...getMockServices(services)}>{element}</SampleDataCardProvider>
    );

  const mount = (element: React.ReactElement, services: Partial<Services> = {}) =>
    mountWithIntl(
      <SampleDataCardProvider {...getMockServices(services)}>{element}</SampleDataCardProvider>
    );

  describe('not installed', () => {
    test('renders', () => {
      const component = render(<SampleDataCard {...{ sampleDataSet, onStatusChange }} />);
      expect(component).toMatchSnapshot();
    });

    test('installs', async () => {
      const component = mount(<SampleDataCard {...{ sampleDataSet, onStatusChange }} />);
      await act(async () => {
        component
          .find(`button[data-test-subj="addSampleDataSet${sampleDataSet.id}"]`)
          .simulate('click');
      });
      expect(onStatusChange).toHaveBeenCalledWith(sampleDataSet.id, INSTALLED_STATUS);
    });
  });

  describe('installed', () => {
    test('renders with app links', () => {
      const component = render(
        <SampleDataCard
          sampleDataSet={getMockDataSet({ status: 'installed' })}
          onStatusChange={onStatusChange}
        />
      );
      expect(component).toMatchSnapshot();
    });

    test('renders without app links', () => {
      const component = render(
        <SampleDataCard
          sampleDataSet={getMockDataSet({ status: 'installed', appLinks: [] })}
          onStatusChange={onStatusChange}
        />
      );
      expect(component).toMatchSnapshot();
    });

    test('removes', async () => {
      const component = mount(
        <SampleDataCard
          sampleDataSet={getMockDataSet({ status: 'installed', appLinks: [] })}
          onStatusChange={onStatusChange}
        />
      );
      await act(async () => {
        component
          .find(`button[data-test-subj="removeSampleDataSet${sampleDataSet.id}"]`)
          .simulate('click');
      });
      expect(onStatusChange).toHaveBeenCalledWith(sampleDataSet.id, UNINSTALLED_STATUS);
    });
  });
});
