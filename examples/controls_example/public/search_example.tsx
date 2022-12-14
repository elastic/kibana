/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useMemo, useState } from 'react';
import type { DataViewSpec } from '@kbn/data-views-plugin/public';
import type { NavigationPublicPluginStart } from '@kbn/navigation-plugin/public';
import {
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { PLUGIN_ID } from './constants';

interface Props {
  dataView: DataViewSpec;
  navigation: NavigationPublicPluginStart;
}

export const SearchExample = ({ dataView, navigation }: Props) => {
  return (
    <>
      <EuiTitle>
        <h2>Search example</h2>
      </EuiTitle>
      <EuiText>
        <p>
          Pass filters, query, and time range to narrow controls. Combine search bar filters with controls filters to narrow data table.
        </p>
      </EuiText>
      <EuiSpacer size="m" />
      <EuiPanel hasBorder={true}>
        <navigation.ui.TopNavMenu
          appName={PLUGIN_ID}
          showSearchBar={true}
          useDefaultBehaviors={true}
          indexPatterns={[dataView]}
        />
      </EuiPanel>
    </>
  );
}