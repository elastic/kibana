/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { mountWithIntl, findTestSubject } from '@kbn/test-jest-helpers';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import {
  CALLOUT_STATE_KEY,
  DocumentExplorerUpdateCallout,
} from './document_explorer_update_callout';
import { LocalStorageMock } from '../../../../__mocks__/local_storage_mock';
import { DiscoverServices } from '../../../../build_services';
import { discoverServiceMock } from '../../../../__mocks__/services';
import { DiscoverTourProvider } from '../../../../components/discover_tour';

const defaultServices = {
  ...discoverServiceMock,
  capabilities: { ...discoverServiceMock.capabilities, advancedSettings: { save: true } },
  storage: new LocalStorageMock({ [CALLOUT_STATE_KEY]: false }),
} as unknown as DiscoverServices;

const mount = (services: DiscoverServices) => {
  return mountWithIntl(
    <KibanaContextProvider services={services}>
      <DocumentExplorerUpdateCallout />
    </KibanaContextProvider>
  );
};

describe('Document Explorer Update callout', () => {
  it('should render callout', () => {
    const result = mount(defaultServices);

    expect(result.find('.dscDocumentExplorerCallout').exists()).toBeTruthy();
  });

  it('should not render callout for user without permissions', () => {
    const services = {
      ...defaultServices,
      capabilities: { advancedSettings: { save: false } },
    } as unknown as DiscoverServices;
    const result = mount(services);

    expect(result.find('.dscDocumentExplorerCallout').exists()).toBeFalsy();
  });

  it('should not render callout of it was closed', () => {
    const services = {
      ...defaultServices,
      storage: new LocalStorageMock({ [CALLOUT_STATE_KEY]: true }),
    } as unknown as DiscoverServices;
    const result = mount(services);

    expect(result.find('.dscDocumentExplorerCallout').exists()).toBeFalsy();
  });

  it('should start a tour when the button is clicked', () => {
    const result = mountWithIntl(
      <KibanaContextProvider services={defaultServices}>
        <DiscoverTourProvider isPlainRecord={false}>
          <DocumentExplorerUpdateCallout />
        </DiscoverTourProvider>
      </KibanaContextProvider>
    );

    expect(result.find({ isStepOpen: true })).toHaveLength(0);
    findTestSubject(result, 'discoverTakeTourButton').simulate('click');
    expect(result.find({ isStepOpen: true })).toHaveLength(1);
  });
});
