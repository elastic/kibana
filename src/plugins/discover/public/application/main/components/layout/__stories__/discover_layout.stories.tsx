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
import { IUiSettingsClient } from '@kbn/core/public';
import { getIndexPatternMock } from './get_index_pattern_mock';
import { getServices } from './get_services';
import { getLayoutProps } from './get_layout_props';
import {
  DEFAULT_COLUMNS_SETTING,
  DOC_TABLE_LEGACY,
  ROW_HEIGHT_OPTION,
  SAMPLE_SIZE_SETTING,
  SEARCH_FIELDS_FROM_SOURCE,
  SHOW_MULTIFIELDS,
} from '../../../../../../common';
import { DiscoverLayout } from '../discover_layout';
import { setHeaderActionMenuMounter } from '../../../../../kibana_services';

setHeaderActionMenuMounter(() => void 0);

export const uiSettingsMock = {
  get: (key: string) => {
    if (key === SAMPLE_SIZE_SETTING) {
      return 10;
    } else if (key === DEFAULT_COLUMNS_SETTING) {
      return ['default_column'];
    } else if (key === DOC_TABLE_LEGACY) {
      return false;
    } else if (key === SEARCH_FIELDS_FROM_SOURCE) {
      return false;
    } else if (key === SHOW_MULTIFIELDS) {
      return false;
    } else if (key === ROW_HEIGHT_OPTION) {
      return 3;
    } else if (key === 'dateFormat:tz') {
      return true;
    }
  },
  isDefault: () => {
    return true;
  },
} as unknown as IUiSettingsClient;

storiesOf('components/layout/DiscoverLayout', module).add('default', () => (
  <IntlProvider locale="en">
    <KibanaContextProvider services={getServices()}>
      <DiscoverLayout {...getLayoutProps(getIndexPatternMock())} />
    </KibanaContextProvider>
  </IntlProvider>
));
