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
import { getIndexPatternMock } from '../../../../../__mocks__/__storybook_mocks__/get_index_pattern_mock';
import { withDiscoverServices } from '../../../../../__mocks__/__storybook_mocks__/with_discover_services';
import { getDocumentsLayoutProps, getPlainRecordLayoutProps } from './get_layout_props';
import { DiscoverLayout } from '../discover_layout';
import { setHeaderActionMenuMounter } from '../../../../../kibana_services';
import { AppState } from '../../../services/discover_state';
import { DiscoverLayoutProps } from '../types';

setHeaderActionMenuMounter(() => void 0);

const DiscoverLayoutStory = (layoutProps: DiscoverLayoutProps) => {
  const [state, setState] = useState(layoutProps.state);

  const setAppState = (newState: Partial<AppState>) => {
    setState((prevState) => ({ ...prevState, ...newState }));
  };

  const getState = () => state;

  return (
    <DiscoverLayout
      {...layoutProps}
      state={state}
      stateContainer={{
        ...layoutProps.stateContainer,
        appStateContainer: { ...layoutProps.stateContainer.appStateContainer, getState },
        setAppState,
      }}
    />
  );
};

storiesOf('components/layout/DiscoverLayout', module).add(
  'Data view with timestamp',
  withDiscoverServices(() => (
    <IntlProvider locale="en">
      <DiscoverLayoutStory {...getDocumentsLayoutProps(getIndexPatternMock(true))} />
    </IntlProvider>
  ))
);

storiesOf('components/layout/DiscoverLayout', module).add(
  'Data view without timestamp',
  withDiscoverServices(() => (
    <IntlProvider locale="en">
      <DiscoverLayoutStory {...getDocumentsLayoutProps(getIndexPatternMock(false))} />
    </IntlProvider>
  ))
);

storiesOf('components/layout/DiscoverLayout', module).add(
  'SQL view',
  withDiscoverServices(() => (
    <IntlProvider locale="en">
      <DiscoverLayoutStory {...getPlainRecordLayoutProps(getIndexPatternMock(false))} />
    </IntlProvider>
  ))
);
