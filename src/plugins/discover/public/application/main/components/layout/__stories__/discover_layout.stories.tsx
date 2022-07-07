/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { storiesOf } from '@storybook/react';
import React from 'react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { getDataViewMock } from './get_data_view_mock';
import { getServices } from './get_services';
import { getLayoutProps } from './get_layout_props';
import { DiscoverLayout } from '../discover_layout';
import { setHeaderActionMenuMounter } from '../../../../../kibana_services';

setHeaderActionMenuMounter(() => void 0);

storiesOf('components/layout/DiscoverLayout', module).add('Data view with timestamp', () => (
  <IntlProvider locale="en">
    <KibanaContextProvider services={getServices()}>
      <DiscoverLayout {...getLayoutProps(getDataViewMock(true))} />
    </KibanaContextProvider>
  </IntlProvider>
));

storiesOf('components/layout/DiscoverLayout', module).add('Data view without timestamp', () => (
  <IntlProvider locale="en">
    <KibanaContextProvider services={getServices()}>
      <DiscoverLayout {...getLayoutProps(getDataViewMock(false))} />
    </KibanaContextProvider>
  </IntlProvider>
));
