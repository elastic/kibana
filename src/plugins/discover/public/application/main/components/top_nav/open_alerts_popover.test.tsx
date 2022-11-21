/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { ReactNode } from 'react';
import { mountWithIntl } from '@kbn/test-jest-helpers';
import { findTestSubject } from '@elastic/eui/lib/test';
import { createSearchSourceMock } from '@kbn/data-plugin/public/mocks';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { AlertsPopover } from './open_alerts_popover';
import { discoverServiceMock } from '../../../../__mocks__/services';
import { dataViewWithTimefieldMock } from '../../../../__mocks__/data_view_with_timefield';
import { dataViewMock } from '../../../../__mocks__/data_view';

const Context = ({ children }: { children: ReactNode }) => <>{children}</>;

const mount = (dataView = dataViewMock) =>
  mountWithIntl(
    <KibanaContextProvider services={discoverServiceMock}>
      <AlertsPopover
        searchSource={createSearchSourceMock({ index: dataView })}
        anchorElement={document.createElement('div')}
        savedQueryId={undefined}
        adHocDataViews={[]}
        services={discoverServiceMock}
        updateDataViewList={jest.fn()}
        onClose={jest.fn()}
        I18nContext={Context}
      />
    </KibanaContextProvider>
  );

describe('OpenAlertsPopover', () => {
  it('should render with the create search threshold rule button disabled if the data view has no time field', () => {
    const component = mount();
    expect(findTestSubject(component, 'discoverCreateAlertButton').prop('disabled')).toBeTruthy();
  });

  it('should render with the create search threshold rule button enabled if the data view has a time field', () => {
    const component = mount(dataViewWithTimefieldMock);
    expect(findTestSubject(component, 'discoverCreateAlertButton').prop('disabled')).toBeFalsy();
  });

  it('should render the manage rules and connectors link', () => {
    const component = mount();
    expect(findTestSubject(component, 'discoverManageAlertsButton').exists()).toBeTruthy();
  });
});
