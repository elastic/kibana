/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useState } from 'react';
import { storiesOf } from '@storybook/react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { AppState } from '../../../services/discover_app_state_container';
import { getDataViewMock } from '../../../../../__mocks__/__storybook_mocks__/get_data_view_mock';
import { withDiscoverServices } from '../../../../../__mocks__/__storybook_mocks__/with_discover_services';
import { getDocumentsLayoutProps, getPlainRecordLayoutProps } from './get_layout_props';
import { DiscoverLayout } from '../discover_layout';
import { setHeaderActionMenuMounter } from '../../../../../kibana_services';
import { DiscoverLayoutProps } from '../types';

setHeaderActionMenuMounter(() => void 0);

const DiscoverLayoutStory = (layoutProps: DiscoverLayoutProps) => {
  const [state, setState] = useState({});

  const setAppState = (newState: Partial<AppState>) => {
    setState((prevState) => ({ ...prevState, ...newState }));
  };

  const getState = () => state;

  return (
    <DiscoverLayout
      {...layoutProps}
      stateContainer={{
        ...layoutProps.stateContainer,
        appState: { ...layoutProps.stateContainer.appState, getState },
        setAppState,
      }}
    />
  );
};

storiesOf('components/layout/DiscoverLayout', module).add(
  'Data view with timestamp',
  withDiscoverServices(() => (
    <IntlProvider locale="en">
      <DiscoverLayoutStory {...getDocumentsLayoutProps(getDataViewMock(true))} />
    </IntlProvider>
  ))
);

storiesOf('components/layout/DiscoverLayout', module).add(
  'Data view without timestamp',
  withDiscoverServices(() => (
    <IntlProvider locale="en">
      <DiscoverLayoutStory {...getDocumentsLayoutProps(getDataViewMock(false))} />
    </IntlProvider>
  ))
);

storiesOf('components/layout/DiscoverLayout', module).add(
  'SQL view',
  withDiscoverServices(() => (
    <IntlProvider locale="en">
      <DiscoverLayoutStory {...getPlainRecordLayoutProps(getDataViewMock(false))} />
    </IntlProvider>
  ))
);
