/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ExpandableFlyoutProps } from '@kbn/expandable-flyout';
import React from 'react';
import DiscoverGridFlyout, {
  DiscoverGridFlyoutProps,
} from '../../../../components/discover_grid_flyout/discover_grid_flyout';
export const expandableFlyoutDocumentsPanels: ExpandableFlyoutProps['registeredPanels'] = [
  {
    key: 'discover-right',
    component: (props) => (
      <DiscoverGridFlyout {...(props.params as unknown as DiscoverGridFlyoutProps)} />
    ),
  },
  {
    key: 'security-right',
    component: (props) => <div>{'My Security Right side'}</div>,
  },
];
